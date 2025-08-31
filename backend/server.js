const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || "https://ywnaacinyhkmxutqturp.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI";

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'blood_bank_secret_key_2025';

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            user_type: user.user_type 
        }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
    );
};

// Routes

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Blood Bank API is running' });
});

// Network test endpoint for React Native
app.get('/api/network-test', (req, res) => {
    console.log('🔍 Network test request received from:', req.ip, req.headers['user-agent']);
    res.json({ 
        status: 'SUCCESS', 
        message: 'React Native connection successful!',
        timestamp: new Date().toISOString(),
        clientIP: req.ip,
        headers: req.headers
    });
});

app.post('/api/network-test', (req, res) => {
    console.log('🔍 POST Network test request received from:', req.ip);
    console.log('🔍 Request body:', req.body);
    res.json({ 
        status: 'SUCCESS', 
        message: 'React Native POST connection successful!',
        timestamp: new Date().toISOString(),
        receivedData: req.body
    });
});

// Debug endpoint to check users (remove in production)
app.get('/api/debug/users', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, user_type, full_name, created_at')
            .limit(10);
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.json({ users: users || [] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Donor Eligibility Check
app.get('/api/donor/eligibility', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user details
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check basic eligibility criteria
        const eligibilityChecks = {
            age: user.age >= 18 && user.age <= 65,
            bloodGroup: user.blood_group ? true : false,
            isActive: user.is_active
        };

        console.log('User data for eligibility check:', {
            id: user.id,
            age: user.age,
            blood_group: user.blood_group,
            is_active: user.is_active,
            user_type: user.user_type
        });
        console.log('Eligibility checks:', eligibilityChecks);

        // Get last donation date
        const { data: lastDonation } = await supabase
            .from('donations')
            .select('donation_date')
            .eq('donor_id', userId)
            .eq('status', 'completed')
            .order('donation_date', { ascending: false })
            .limit(1);

        let daysSinceLastDonation = null;
        let canDonateDate = new Date();
        
        if (lastDonation && lastDonation.length > 0) {
            const lastDonationDate = new Date(lastDonation[0].donation_date);
            const today = new Date();
            daysSinceLastDonation = Math.floor((today - lastDonationDate) / (1000 * 60 * 60 * 24));
            
            // Minimum 56 days (8 weeks) between donations
            if (daysSinceLastDonation < 56) {
                canDonateDate = new Date(lastDonationDate);
                canDonateDate.setDate(canDonateDate.getDate() + 56);
                eligibilityChecks.timeSinceLastDonation = false;
            } else {
                eligibilityChecks.timeSinceLastDonation = true;
            }
        } else {
            eligibilityChecks.timeSinceLastDonation = true; // First time donor
        }

        const isEligible = Object.values(eligibilityChecks).every(check => check === true);

        res.json({
            eligible: isEligible,
            checks: eligibilityChecks,
            daysSinceLastDonation,
            canDonateDate: canDonateDate.toISOString().split('T')[0],
            message: isEligible ? 'You are eligible to donate!' : 'Please check eligibility requirements'
        });

    } catch (error) {
        console.error('Eligibility check error:', error);
        res.status(500).json({ error: 'Failed to check eligibility' });
    }
});

// Get Available Donation Centers
// Get donation centers (public endpoint)
app.get('/api/donation-centers', async (req, res) => {
    try {
        // For now, return static data. In production, this would come from database
        const centers = [
            {
                id: 1,
                name: 'City Blood Bank',
                address: '123 Main Street, City Center',
                phone: '+1234567890',
                workingHours: '9:00 AM - 6:00 PM',
                availableSlots: ['10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM']
            },
            {
                id: 2,
                name: 'General Hospital Blood Center',
                address: '456 Hospital Road, Medical District',
                phone: '+1234567891',
                workingHours: '8:00 AM - 8:00 PM',
                availableSlots: ['9:00 AM', '10:00 AM', '1:00 PM', '2:00 PM', '5:00 PM']
            },
            {
                id: 3,
                name: 'Community Health Center',
                address: '789 Community Blvd, Suburb',
                phone: '+1234567892',
                workingHours: '10:00 AM - 5:00 PM',
                availableSlots: ['11:00 AM', '12:00 PM', '3:00 PM', '4:00 PM']
            }
        ];

        res.json({ centers });
    } catch (error) {
        console.error('Error fetching donation centers:', error);
        res.status(500).json({ error: 'Failed to fetch donation centers' });
    }
});

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { 
            email, 
            password, 
            user_type, 
            full_name, 
            phone, 
            blood_group, 
            age, 
            address,
            emergency_contact,
            medical_conditions 
        } = req.body;

        // Validate required fields
        if (!email || !password || !user_type || !full_name) {
            return res.status(400).json({ 
                error: 'Email, password, user type, and full name are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate user type
        if (!['admin', 'donor', 'recipient'].includes(user_type)) {
            return res.status(400).json({ 
                error: 'User type must be admin, donor, or recipient' 
            });
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('email, user_type, full_name')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return res.status(400).json({ 
                error: 'Account already exists',
                message: `An account with email ${email} is already registered as ${existingUser.user_type}. Please use the login option or use a different email address.`,
                suggestion: 'Try logging in instead or contact support if you forgot your password.'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into Supabase
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    user_type,
                    full_name,
                    phone: phone || null,
                    blood_group: blood_group || null,
                    age: age ? parseInt(age) : null,
                    address: address || null,
                    emergency_contact: emergency_contact || null,
                    medical_conditions: medical_conditions || null,
                    is_active: true,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }

        // Generate token
        const token = generateToken(data);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = data;

        res.status(201).json({
            message: 'User registered successfully',
            user: userWithoutPassword,
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, user_type } = req.body;

        if (!email || !password || !user_type) {
            return res.status(400).json({ 
                error: 'Email, password, and user type are required' 
            });
        }

        // Validate user type
        if (!['admin', 'donor', 'recipient'].includes(user_type)) {
            return res.status(400).json({ 
                error: 'Invalid user type' 
            });
        }

        // Get user from Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('user_type', user_type)
            .eq('is_active', true)
            .single();

        console.log('Login attempt for:', { email: email.toLowerCase(), user_type });
        console.log('User found:', user ? 'Yes' : 'No');
        console.log('Database error:', error);

        if (error || !user) {
            if (error && error.code === 'PGRST116') {
                return res.status(401).json({ 
                    error: 'User not found', 
                    message: `No ${user_type} account found with email ${email}. Please check your email or register first.` 
                });
            }
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('Password verification:', isValidPassword);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Invalid password', 
                message: 'The password you entered is incorrect. Please try again.' 
            });
        }

        // Generate token
        const token = generateToken(user);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Login successful',
            user: userWithoutPassword,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get User Profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, user_type, full_name, phone, blood_group, age, address, emergency_contact, medical_conditions, created_at')
            .eq('id', req.user.id)
            .single();

        if (error) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update User Profile
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { 
            full_name, 
            phone, 
            blood_group, 
            age, 
            address,
            emergency_contact,
            medical_conditions 
        } = req.body;

        const { data, error } = await supabase
            .from('users')
            .update({
                full_name,
                phone,
                blood_group,
                age,
                address,
                emergency_contact,
                medical_conditions,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const { password: _, ...userWithoutPassword } = data;
        res.json({ 
            message: 'Profile updated successfully', 
            user: userWithoutPassword 
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Blood Request Routes (for recipients)
app.post('/api/blood-request', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'recipient') {
            return res.status(403).json({ error: 'Only recipients can create blood requests' });
        }

        const { 
            blood_group_needed, 
            units_needed, 
            urgency_level, 
            hospital_name, 
            hospital_address, 
            required_by_date, 
            notes 
        } = req.body;

        const { data, error } = await supabase
            .from('blood_requests')
            .insert([
                {
                    recipient_id: req.user.id,
                    blood_group_needed,
                    units_needed,
                    urgency_level,
                    hospital_name,
                    hospital_address,
                    required_by_date,
                    notes,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({
            message: 'Blood request created successfully',
            request: data
        });

    } catch (error) {
        console.error('Blood request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Blood Requests
app.get('/api/blood-requests', authenticateToken, async (req, res) => {
    try {
        let query = supabase
            .from('blood_requests')
            .select(`
                *,
                users!blood_requests_recipient_id_fkey(full_name, phone, email)
            `);

        // If recipient, only show their requests
        if (req.user.user_type === 'recipient') {
            query = query.eq('recipient_id', req.user.id);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ requests: data });

    } catch (error) {
        console.error('Get blood requests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Donation Routes (for donors)
app.post('/api/donation', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'donor') {
            return res.status(403).json({ error: 'Only donors can record donations' });
        }

        const { 
            donation_date, 
            units_donated, 
            donation_center, 
            notes 
        } = req.body;

        const { data, error } = await supabase
            .from('donations')
            .insert([
                {
                    donor_id: req.user.id,
                    donation_date,
                    units_donated,
                    donation_center,
                    notes,
                    status: 'completed',
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({
            message: 'Donation recorded successfully',
            donation: data
        });

    } catch (error) {
        console.error('Donation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Donations
app.get('/api/donations', authenticateToken, async (req, res) => {
    try {
        let query = supabase
            .from('donations')
            .select(`
                *,
                users!donations_donor_id_fkey(full_name, phone, email, blood_group)
            `);

        // If donor, only show their donations
        if (req.user.user_type === 'donor') {
            query = query.eq('donor_id', req.user.id);
        }

        const { data, error } = await query.order('donation_date', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ donations: data });

    } catch (error) {
        console.error('Get donations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Schedule Donation Appointment
app.post('/api/donor/schedule-donation', authenticateToken, async (req, res) => {
    try {
        const { donation_center, donation_date, donation_time, donation_type, notes } = req.body;
        const donor_id = req.user.id;

        // Validate donor
        if (req.user.user_type !== 'donor') {
            return res.status(403).json({ error: 'Only donors can schedule donations' });
        }

        // Validate required fields
        if (!donation_center || !donation_date) {
            return res.status(400).json({ error: 'Donation center and date are required' });
        }

        // Check eligibility first
        const eligibilityResponse = await fetch(`${req.protocol}://${req.get('host')}/api/donor/eligibility`, {
            headers: { Authorization: req.headers.authorization }
        });
        const eligibility = await eligibilityResponse.json();

        if (!eligibility.eligible) {
            return res.status(400).json({ 
                error: 'Not eligible to donate',
                message: `You can donate again on ${eligibility.canDonateDate}`
            });
        }

        // Create scheduled donation record
        const { data, error } = await supabase
            .from('donations')
            .insert([
                {
                    donor_id,
                    donation_date,
                    units_donated: 1, // Default to 1 unit
                    donation_center: `${donation_center}${donation_time ? ` at ${donation_time}` : ''}`,
                    notes: notes || `${donation_type} donation scheduled`,
                    status: 'scheduled'
                }
            ])
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({
            message: 'Donation scheduled successfully',
            donation: data,
            appointment: {
                center: donation_center,
                date: donation_date,
                time: donation_time,
                type: donation_type
            }
        });

    } catch (error) {
        console.error('Schedule donation error:', error);
        res.status(500).json({ error: 'Failed to schedule donation' });
    }
});

// Helper function to check for pending donations
const checkPendingDonations = async (donorId) => {
    try {
        const { data: pendingDonations, error } = await supabase
            .from('donations')
            .select('*')
            .eq('donor_id', donorId)
            .in('status', ['pending_admin_approval', 'scheduled'])
            .order('created_at', { ascending: false });

        if (error) throw error;

        return {
            hasPending: pendingDonations && pendingDonations.length > 0,
            pendingCount: pendingDonations ? pendingDonations.length : 0,
            latestPending: pendingDonations && pendingDonations.length > 0 ? pendingDonations[0] : null
        };
    } catch (error) {
        console.error('Error checking pending donations:', error);
        return { hasPending: false, pendingCount: 0, latestPending: null };
    }
};

// Complete Walk-in Donation
app.post('/api/donor/walk-in-donation', authenticateToken, async (req, res) => {
    try {
        console.log('=== NEW DONATION SUBMISSION ===');
        console.log('User:', req.user.full_name, '(', req.user.id, ')');
        console.log('Request body:', req.body);
        
        const { 
            donation_center, 
            units_donated, 
            notes, 
            verification_photo, 
            ai_verification, 
            status,
            verification_status 
        } = req.body;
        const donor_id = req.user.id;

        // Validate donor
        if (req.user.user_type !== 'donor') {
            return res.status(403).json({ 
                error: 'Access denied',
                title: 'Permission Error',
                message: 'Only donors can record donations'
            });
        }

        // Get complete donor information including blood group
        const { data: donor, error: donorError } = await supabase
            .from('users')
            .select('full_name, blood_group, email')
            .eq('id', donor_id)
            .single();

        if (donorError || !donor) {
            console.error('Donor fetch error:', donorError);
            return res.status(400).json({ error: 'Donor information not found' });
        }

        console.log('Donor details:', donor.full_name, 'Blood group:', donor.blood_group);

        // Check for pending donations first
        const pendingCheck = await checkPendingDonations(req.user.id);
        
        if (pendingCheck.hasPending) {
            return res.status(400).json({
                error: 'Pending donation exists',
                title: 'Donation Already Pending',
                message: `You have ${pendingCheck.pendingCount} donation(s) awaiting admin approval. Please wait for approval before submitting a new donation.`,
                pendingDonation: {
                    date: pendingCheck.latestPending.donation_date,
                    center: pendingCheck.latestPending.donation_center,
                    units: pendingCheck.latestPending.units_donated,
                    status: pendingCheck.latestPending.status,
                    submittedAt: pendingCheck.latestPending.submitted_at
                }
            });
        }

        // Validate required fields
        if (!donation_center) {
            return res.status(400).json({ error: 'Donation center is required' });
        }

        // For AI verification, require photo and verification data
        if (verification_photo && !ai_verification) {
            return res.status(400).json({ error: 'AI verification data is required when photo is provided' });
        }

        // Check eligibility first (only for completed donations)
        if (status !== 'pending_admin_approval') {
            const eligibilityResponse = await fetch(`${req.protocol}://${req.get('host')}/api/donor/eligibility`, {
                headers: { Authorization: req.headers.authorization }
            });
            const eligibility = await eligibilityResponse.json();

            if (!eligibility.eligible) {
                return res.status(400).json({ 
                    error: 'Not eligible to donate',
                    message: `You can donate again on ${eligibility.canDonateDate}`
                });
            }
        }

        // Create donation record with AI verification data
        console.log('Creating donation record...');
        const { data, error } = await supabase
            .from('donations')
            .insert([
                {
                    donor_id,
                    donation_date: new Date().toISOString().split('T')[0],
                    units_donated: units_donated || 1,
                    donation_center,
                    notes: notes || 'Walk-in donation',
                    status: status || 'pending_admin_approval',
                    verification_photo: verification_photo || null,
                    ai_verification: ai_verification || null,
                    verification_status: verification_status || 'ai_verified',
                    admin_approved: false,
                    submitted_at: new Date().toISOString(),
                    source: 'walk_in'
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Donation creation error:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('✅ Donation created successfully:', data.id);

        // CRITICAL: Update blood inventory immediately for pending donations too
        console.log('=== UPDATING BLOOD INVENTORY ===');
        console.log('Blood group to update:', donor.blood_group);
        console.log('Units to add:', units_donated || 1);

        if (donor && donor.blood_group) {
            try {
                // Get existing inventory for this blood group
                const { data: existingInventory, error: fetchError } = await supabase
                    .from('blood_inventory')
                    .select('units_available')
                    .eq('blood_group', donor.blood_group)
                    .single();

                console.log('Existing inventory check:', existingInventory);

                if (existingInventory) {
                    // Update existing inventory
                    const newTotal = existingInventory.units_available + (units_donated || 1);
                    console.log('Updating existing inventory:', existingInventory.units_available, '→', newTotal);
                    
                    const { data: updateResult, error: updateError } = await supabase
                        .from('blood_inventory')
                        .update({
                            units_available: newTotal,
                            updated_at: new Date().toISOString()
                        })
                        .eq('blood_group', donor.blood_group)
                        .select();
                    
                    if (updateError) {
                        console.error('❌ Inventory update failed:', updateError);
                    } else {
                        console.log('✅ Blood inventory updated successfully!');
                        console.log('Updated inventory:', updateResult);
                    }
                } else {
                    // Create new inventory entry
                    console.log('Creating new inventory entry for', donor.blood_group);
                    
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + 7);
                    
                    const { data: insertResult, error: insertError } = await supabase
                        .from('blood_inventory')
                        .insert({
                            blood_group: donor.blood_group,
                            units_available: units_donated || 1,
                            location: donation_center || 'Main Blood Bank',
                            expiry_date: expiryDate.toISOString().split('T')[0],
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .select();
                    
                    if (insertError) {
                        console.error('❌ Inventory creation failed:', insertError);
                    } else {
                        console.log('✅ New blood inventory created!');
                        console.log('New inventory:', insertResult);
                    }
                }
            } catch (inventoryError) {
                console.error('Blood inventory update error:', inventoryError);
                // Don't fail the whole donation for inventory errors
            }
        } else {
            console.warn('⚠️ No blood group found for donor, skipping inventory update');
        }

        // Return success response
        console.log('=== DONATION SUBMISSION COMPLETE ===');
        res.status(201).json({
            success: true,
            message: 'Donation submitted for admin approval',
            donation: data,
            ai_verification: ai_verification,
            status: 'pending_approval',
            certificate: {
                donorName: donor.full_name,
                bloodGroup: donor.blood_group,
                date: data.donation_date,
                center: donation_center,
                units: units_donated || 1
            }
        });

    } catch (error) {
        console.error('=== DONATION SUBMISSION ERROR ===');
        console.error('Error details:', error);
        res.status(500).json({ 
            error: 'Failed to record donation',
            details: error.message 
        });
    }
});

// Record Past Donation
app.post('/api/donor/past-donation', authenticateToken, async (req, res) => {
    try {
        const { donation_center, donation_date, units_donated, notes, source } = req.body;
        const donor_id = req.user.id;

        // Validate donor
        if (req.user.user_type !== 'donor') {
            return res.status(403).json({ error: 'Only donors can record donations' });
        }

        // Validate required fields
        if (!donation_center || !donation_date) {
            return res.status(400).json({ error: 'Donation center and date are required' });
        }

        // Validate date is within last 90 days
        const donationDateObj = new Date(donation_date);
        const today = new Date();
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);

        if (donationDateObj < ninetyDaysAgo || donationDateObj > today) {
            return res.status(400).json({ 
                error: 'Donation date must be within the last 90 days' 
            });
        }

        // Create past donation record
        const { data, error } = await supabase
            .from('donations')
            .insert([
                {
                    donor_id,
                    donation_date,
                    units_donated: units_donated || 1,
                    donation_center,
                    notes: notes || 'Past donation recorded manually',
                    status: 'completed',
                    source: source || 'manual_entry'
                }
            ])
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Add blood inventory entry for past donation
        const { data: donor } = await supabase
            .from('users')
            .select('blood_group, full_name')
            .eq('id', donor_id)
            .single();

        if (donor && donor.blood_group) {
            // Update blood inventory for past donation
            try {
                // Get existing inventory for this blood group
                const { data: existingInventory } = await supabase
                    .from('blood_inventory')
                    .select('units_available')
                    .eq('blood_group', donor.blood_group)
                    .single();

                if (existingInventory) {
                    // Update existing inventory
                    const newTotal = existingInventory.units_available + (units_donated || 1);
                    await supabase
                        .from('blood_inventory')
                        .update({
                            units_available: newTotal,
                            updated_at: new Date().toISOString()
                        })
                        .eq('blood_group', donor.blood_group);
                    
                    console.log(`✅ Past donation: Updated ${donor.blood_group} inventory: +${units_donated || 1} units (total: ${newTotal})`);
                } else {
                    // Create new inventory entry if none exists
                    const donationDateObj = new Date(donation_date);
                    const expiryDate = new Date(donationDateObj);
                    expiryDate.setDate(donationDateObj.getDate() + 7); // 7 days from donation
                    
                    await supabase
                        .from('blood_inventory')
                        .insert({
                            blood_group: donor.blood_group,
                            units_available: units_donated || 1,
                            location: donation_center,
                            expiry_date: expiryDate.toISOString().split('T')[0]
                        });
                    
                    console.log(`✅ Past donation: Created new ${donor.blood_group} inventory: ${units_donated || 1} units`);
                }
            } catch (inventoryError) {
                console.error('Blood inventory update error for past donation:', inventoryError);
                // Don't fail the whole donation for inventory errors
            }
        }

        res.status(201).json({
            message: 'Past donation recorded successfully!',
            donation: data,
            certificate: {
                donorName: req.user.full_name,
                date: data.donation_date,
                center: donation_center,
                units: units_donated || 1,
                bloodGroup: user?.blood_group,
                isPastDonation: true
            }
        });

    } catch (error) {
        console.error('Past donation error:', error);
        res.status(500).json({ error: 'Failed to record past donation' });
    }
});

// Get Donor's Pending Donations
app.get('/api/donor/pending-donations', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'donor') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { data: pendingDonations, error } = await supabase
            .from('donations')
            .select('*')
            .eq('donor_id', req.user.id)
            .in('status', ['pending_admin_approval', 'scheduled'])
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ 
            pendingDonations: pendingDonations || [],
            count: pendingDonations ? pendingDonations.length : 0
        });
    } catch (error) {
        console.error('Error fetching pending donations:', error);
        res.status(500).json({ error: 'Failed to fetch pending donations' });
    }
});

// Get Donor Statistics
app.get('/api/donor/stats', authenticateToken, async (req, res) => {
    try {
        const donor_id = req.user.id;

        if (req.user.user_type !== 'donor') {
            return res.status(403).json({ error: 'Only donors can view donation stats' });
        }

        // Get donation statistics
        const { data: donations, error } = await supabase
            .from('donations')
            .select('*')
            .eq('donor_id', donor_id)
            .eq('status', 'completed');

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const totalDonations = donations.length;
        const totalUnits = donations.reduce((sum, donation) => sum + donation.units_donated, 0);
        const lastDonation = donations.length > 0 ? 
            Math.max(...donations.map(d => new Date(d.donation_date))) : null;

        // Calculate next eligible date
        let nextEligibleDate = new Date();
        if (lastDonation) {
            nextEligibleDate = new Date(lastDonation);
            nextEligibleDate.setDate(nextEligibleDate.getDate() + 56); // 8 weeks
        }

        res.json({
            stats: {
                totalDonations,
                totalUnits,
                lastDonationDate: lastDonation ? new Date(lastDonation).toISOString().split('T')[0] : null,
                nextEligibleDate: nextEligibleDate.toISOString().split('T')[0],
                donationHistory: donations.map(d => ({
                    date: d.donation_date,
                    center: d.donation_center,
                    units: d.units_donated,
                    status: d.status
                }))
            }
        });

    } catch (error) {
        console.error('Donor stats error:', error);
        res.status(500).json({ error: 'Failed to get donor statistics' });
    }
});

// Admin Routes
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Get dashboard statistics
        const [usersResult, requestsResult, donationsResult] = await Promise.all([
            supabase.from('users').select('user_type', { count: 'exact' }),
            supabase.from('blood_requests').select('status', { count: 'exact' }),
            supabase.from('donations').select('id', { count: 'exact' })
        ]);

        const stats = {
            total_users: usersResult.count || 0,
            total_requests: requestsResult.count || 0,
            total_donations: donationsResult.count || 0,
            users_by_type: {},
            requests_by_status: {}
        };

        // Count users by type
        if (usersResult.data) {
            usersResult.data.forEach(user => {
                stats.users_by_type[user.user_type] = (stats.users_by_type[user.user_type] || 0) + 1;
            });
        }

        // Count requests by status
        if (requestsResult.data) {
            requestsResult.data.forEach(request => {
                stats.requests_by_status[request.status] = (stats.requests_by_status[request.status] || 0) + 1;
            });
        }

        res.json({ stats });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get All Users (Admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { data, error } = await supabase
            .from('users')
            .select('id, email, user_type, full_name, phone, blood_group, age, is_active, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ users: data });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Blood Inventory (Admin only)
app.get('/api/admin/blood-inventory', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        console.log('=== ADMIN BLOOD INVENTORY REQUEST ===');
        
        const { data: inventory, error } = await supabase
            .from('blood_inventory')
            .select('*')
            .order('last_updated', { ascending: false });

        if (error) {
            console.error('Admin blood inventory fetch error:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('📊 Admin inventory fetch successful:', inventory?.length || 0, 'items');

        // Calculate summary statistics
        const summary = {
            totalUnits: inventory?.reduce((sum, item) => sum + item.units_available, 0) || 0,
            bloodGroups: inventory?.length || 0,
            totalBatches: inventory?.length || 0,
            lastUpdated: inventory?.[0]?.last_updated || null
        };

        // Group by blood group for better organization
        const groupedInventory = {};
        inventory?.forEach(item => {
            if (!groupedInventory[item.blood_group]) {
                groupedInventory[item.blood_group] = [];
            }
            groupedInventory[item.blood_group].push(item);
        });

        res.json({
            success: true,
            inventory: inventory || [],
            groupedInventory,
            summary
        });

    } catch (error) {
        console.error('Admin blood inventory error:', error);
        res.status(500).json({ error: 'Failed to fetch blood inventory' });
    }
});

// Admin: Get pending donations for approval
app.get('/api/admin/pending-donations', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Only admins can view pending donations' });
        }

        const { data, error } = await supabase
            .from('donations')
            .select(`
                *,
                users!donor_id (
                    id,
                    full_name,
                    email,
                    blood_group
                )
            `)
            .eq('admin_approved', false)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ pendingDonations: data || [] });

    } catch (error) {
        console.error('Get pending donations error:', error);
        res.status(500).json({ error: 'Failed to fetch pending donations' });
    }
});

// Admin: Approve or reject donation
app.post('/api/admin/approve-donation/:donationId', authenticateToken, async (req, res) => {
    try {
        console.log('🔄 Admin approval request:', { donationId: req.params.donationId, action: req.body.action });
        
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Only admins can approve donations' });
        }

        const { donationId } = req.params;
        const { action, admin_notes } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Action must be either approve or reject' });
        }

        // Get donation details first
        const { data: donation, error: fetchError } = await supabase
            .from('donations')
            .select('*, users!donor_id(blood_group, full_name)')
            .eq('id', donationId)
            .single();

        if (fetchError || !donation) {
            console.error('❌ Donation not found:', fetchError);
            return res.status(404).json({ error: 'Donation not found' });
        }

        console.log('📋 Found donation:', {
            id: donation.id,
            donor: donation.users?.blood_group,
            units: donation.units_donated,
            status: donation.status
        });

        // Update donation status
        const updateData = {
            status: action === 'approve' ? 'completed' : 'rejected',
            admin_approved: action === 'approve',
            approved_by: req.user.id,
            admin_notes: admin_notes || null,
            approved_at: new Date().toISOString(),
            verification_status: action === 'approve' ? 'admin_approved' : 'rejected'
        };

        const { error: updateError } = await supabase
            .from('donations')
            .update(updateData)
            .eq('id', donationId);

        if (updateError) {
            console.error('❌ Error updating donation:', updateError);
            return res.status(400).json({ error: updateError.message });
        }

        console.log('✅ Donation status updated successfully');

        // If approved, update blood inventory
        if (action === 'approve' && donation.users?.blood_group) {
            try {
                console.log('🩸 Adding new blood inventory entry...');
                
                // Create new inventory entry for each approved donation
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 42); // 42 days from approval
                
                const batchNumber = `${donation.users.blood_group}-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
                
                const { data: inventoryResult, error: inventoryError } = await supabase
                    .from('blood_inventory')
                    .insert({
                        blood_group: donation.users.blood_group,
                        units_available: donation.units_donated,
                        batch_number: batchNumber,
                        donation_id: donation.id,
                        donor_id: donation.donor_id,
                        donor_name: donation.users.full_name,
                        donation_date: donation.donation_date,
                        collection_date: new Date().toISOString().split('T')[0],
                        expiry_date: expiryDate.toISOString().split('T')[0],
                        status: 'available',
                        location: donation.donation_center || 'Main Blood Bank',
                        notes: `Added from approved donation ID: ${donation.id}`,
                        created_at: new Date().toISOString(),
                        last_updated: new Date().toISOString()
                    })
                    .select();
                
                if (inventoryError) {
                    console.error('❌ Inventory creation failed:', inventoryError);
                } else {
                    console.log(`✅ Admin approved: Created new ${donation.users.blood_group} inventory batch: ${donation.units_donated} units`);
                    console.log('📦 New inventory entry:', inventoryResult);
                }
            } catch (inventoryError) {
                console.error('❌ Blood inventory update error during admin approval:', inventoryError);
                // Don't fail the approval for inventory errors
            }
        }

        res.json({ 
            success: true,
            message: `Donation ${action}d successfully`,
            donation: { ...donation, ...updateData }
        });

    } catch (error) {
        console.error('❌ Approve donation error:', error);
        res.status(500).json({ error: 'Failed to process donation approval' });
    }
});

// Submit donation request (simplified version)
app.post('/api/donor/submit-donation-request', authenticateToken, async (req, res) => {
    console.log('=== SUBMIT DONATION REQUEST ===');
    console.log('User:', req.user);
    console.log('Body:', req.body);
    
    try {
        if (req.user.user_type !== 'donor') {
            return res.status(403).json({ error: 'Access denied. Only donors can submit donation requests.' });
        }

        const { donationDetails } = req.body;

        // Basic validation
        if (!donationDetails) {
            return res.status(400).json({ 
                error: 'Missing donation details',
                message: 'Please provide donation details'
            });
        }

        console.log('Creating donation with details:', donationDetails);

        // Insert donation into donations table with admin_approved = false for pending approval
        const { data: donation, error } = await supabase
            .from('donations')
            .insert({
                donor_id: req.user.id,
                donation_date: donationDetails.donation_date || new Date().toISOString().split('T')[0],
                units_donated: donationDetails.units_donated || 1,
                donation_center: donationDetails.donation_center || 'Walk-in Donation',
                notes: donationDetails.notes || '',
                status: 'completed',
                admin_approved: false // Pending admin approval
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating donation:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Donation created successfully:', donation);

        res.json({
            success: true,
            message: 'Donation request submitted successfully for admin approval',
            donation: donation
        });

    } catch (error) {
        console.error('Submit donation request error:', error);
        res.status(500).json({ error: 'Failed to submit donation request' });
    }
});

// Check donation eligibility (buffer period)
app.get('/api/donor/check-eligibility', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'donor') {
            return res.status(403).json({ error: 'Only donors can check eligibility' });
        }

        let eligibility = null;
        try {
            const { data: eligibilityCheck, error } = await supabase
                .rpc('check_donation_eligibility', { donor_uuid: req.user.id });

            if (error) {
                console.error('Error checking donation eligibility with function:', error);
                
                // Fallback: Check eligibility manually if function doesn't exist
                const { data: lastDonation, error: lastDonationError } = await supabase
                    .from('donations')
                    .select('donation_date')
                    .eq('donor_id', req.user.id)
                    .eq('status', 'completed')
                    .eq('admin_approved', true)
                    .order('donation_date', { ascending: false })
                    .limit(1);

                if (lastDonationError) {
                    console.error('Error checking last donation:', lastDonationError);
                    return res.status(500).json({ error: 'Failed to check donation eligibility' });
                }

                // Manual eligibility calculation
                if (lastDonation && lastDonation.length > 0) {
                    const lastDonationDate = new Date(lastDonation[0].donation_date);
                    const daysSince = Math.floor((new Date() - lastDonationDate) / (1000 * 60 * 60 * 24));
                    const daysRemaining = Math.max(0, 56 - daysSince);
                    
                    eligibility = {
                        is_eligible: daysSince >= 56,
                        last_donation_date: lastDonation[0].donation_date,
                        next_eligible_date: new Date(lastDonationDate.getTime() + (56 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                        days_remaining: daysRemaining,
                        reason: daysSince >= 56 ? 'Buffer period completed - eligible to donate' : `Buffer period active - must wait ${daysRemaining} more days`
                    };
                } else {
                    // First time donor
                    eligibility = {
                        is_eligible: true,
                        last_donation_date: null,
                        next_eligible_date: new Date().toISOString().split('T')[0],
                        days_remaining: 0,
                        reason: 'First time donor - eligible to donate'
                    };
                }
            } else {
                eligibility = eligibilityCheck[0];
            }
        } catch (functionError) {
            console.error('Function call failed, using fallback:', functionError);
            
            // Fallback eligibility check - first check pending donations
            const { data: pendingDonations, error: pendingError } = await supabase
                .from('pending_donations')
                .select('id')
                .eq('donor_id', req.user.id)
                .eq('status', 'pending_admin_approval');

            let pendingCount = 0;
            if (pendingDonations && !pendingError) {
                pendingCount = pendingDonations.length;
            }

            if (pendingCount > 0) {
                eligibility = {
                    is_eligible: false,
                    last_donation_date: null,
                    next_eligible_date: null,
                    days_remaining: 0,
                    reason: `You have ${pendingCount} pending donation${pendingCount > 1 ? 's' : ''} awaiting admin approval. Please wait for approval before submitting new requests.`,
                    pending_donations_count: pendingCount
                };
            } else {
                // Check buffer period
                const { data: lastDonation, error: lastDonationError } = await supabase
                    .from('donations')
                    .select('donation_date')
                    .eq('donor_id', req.user.id)
                    .eq('status', 'completed')
                    .eq('admin_approved', true)
                    .order('donation_date', { ascending: false })
                    .limit(1);

            if (lastDonationError) {
                console.error('Error in fallback eligibility check:', lastDonationError);
                // Return eligible by default if we can't check
                eligibility = {
                    is_eligible: true,
                    last_donation_date: null,
                    next_eligible_date: new Date().toISOString().split('T')[0],
                    days_remaining: 0,
                    reason: 'Unable to verify donation history - proceeding with caution'
                };
            } else if (lastDonation && lastDonation.length > 0) {
                const lastDonationDate = new Date(lastDonation[0].donation_date);
                const daysSince = Math.floor((new Date() - lastDonationDate) / (1000 * 60 * 60 * 24));
                const daysRemaining = Math.max(0, 56 - daysSince);
                
                eligibility = {
                    is_eligible: daysSince >= 56,
                    last_donation_date: lastDonation[0].donation_date,
                    next_eligible_date: new Date(lastDonationDate.getTime() + (56 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                    days_remaining: daysRemaining,
                    reason: daysSince >= 56 ? 'Buffer period completed - eligible to donate' : `Buffer period active - must wait ${daysRemaining} more days`,
                    pending_donations_count: pendingCount
                };
            } else {
                // First time donor
                eligibility = {
                    is_eligible: true,
                    last_donation_date: null,
                    next_eligible_date: new Date().toISOString().split('T')[0],
                    days_remaining: 0,
                    reason: 'First time donor - eligible to donate',
                    pending_donations_count: pendingCount
                };
            }
            }
        }
        
        res.json({
            isEligible: eligibility.is_eligible,
            lastDonationDate: eligibility.last_donation_date,
            nextEligibleDate: eligibility.next_eligible_date,
            daysRemaining: eligibility.days_remaining,
            reason: eligibility.reason,
            pendingDonationsCount: eligibility.pending_donations_count || 0
        });

    } catch (error) {
        console.error('Check eligibility error:', error);
        res.status(500).json({ error: 'Failed to check donation eligibility' });
    }
});

// Enhanced: Get pending donations for admin with full details
app.get('/api/admin/enhanced-pending-donations', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Only admins can view pending donations' });
        }

        const { data, error } = await supabase
            .from('admin_pending_donations_view')
            .select('*')
            .order('submitted_at', { ascending: true }); // Oldest first for fairness

        if (error) {
            console.error('Error fetching pending donations:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ 
            success: true,
            pendingDonations: data || [],
            count: data?.length || 0
        });

    } catch (error) {
        console.error('Get enhanced pending donations error:', error);
        res.status(500).json({ error: 'Failed to fetch pending donations' });
    }
});

// Enhanced: Approve or reject pending donation with certificate generation
app.post('/api/admin/process-donation-request/:pendingId', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Only admins can process donation requests' });
        }

        const { pendingId } = req.params;
        const { action, admin_notes } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Action must be either approve or reject' });
        }

        // Get pending donation details
        const { data: pendingDonation, error: fetchError } = await supabase
            .from('pending_donations')
            .select(`
                *,
                users!donor_id (
                    id,
                    full_name,
                    email,
                    blood_group,
                    phone
                )
            `)
            .eq('id', pendingId)
            .single();

        if (fetchError || !pendingDonation) {
            return res.status(404).json({ error: 'Pending donation not found' });
        }

        // Double-check risk score before approval
        if (action === 'approve' && pendingDonation.risk_score > 60) {
            return res.status(400).json({ 
                error: 'Cannot approve high-risk donation',
                message: `Risk score (${pendingDonation.risk_score}%) exceeds safety threshold (60%)` 
            });
        }

        // Update pending donation status
        const updateData = {
            status: action === 'approve' ? 'approved' : 'rejected',
            admin_id: req.user.id,
            admin_notes: admin_notes || null,
            admin_decision_date: new Date().toISOString()
        };

        // If approving, also generate certificate data
        if (action === 'approve') {
            const certificateData = {
                certificateNumber: `CERT-${Date.now()}-${pendingDonation.id.substring(0, 8)}`,
                donorName: pendingDonation.users.full_name,
                bloodGroup: pendingDonation.users.blood_group,
                units: pendingDonation.units_donated,
                donationCenter: pendingDonation.donation_center,
                donationDate: pendingDonation.donation_date,
                approvalDate: new Date().toISOString(),
                adminName: req.user.full_name || 'Admin',
                riskScore: pendingDonation.risk_score,
                validityPeriod: '1 year'
            };

            updateData.certificate_generated = true;
            updateData.certificate_data = certificateData;
            updateData.certificate_generated_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
            .from('pending_donations')
            .update(updateData)
            .eq('id', pendingId);

        if (updateError) {
            console.error('Error updating pending donation:', updateError);
            return res.status(400).json({ error: updateError.message });
        }

        // The trigger will automatically create donation record and update inventory
        // for approved donations, so we don't need to do it manually here

        res.json({
            success: true,
            message: `Donation request ${action}d successfully`,
            action: action,
            certificateGenerated: action === 'approve',
            certificateData: action === 'approve' ? updateData.certificate_data : null
        });

    } catch (error) {
        console.error('Process donation request error:', error);
        res.status(500).json({ error: 'Failed to process donation request' });
    }
});

// Enhanced: Get donor dashboard stats with pending approvals
app.get('/api/donor/enhanced-stats', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'donor') {
            return res.status(403).json({ error: 'Only donors can view their stats' });
        }

        const { data: allDonations, error: donationsError } = await supabase
            .from('donations')
            .select('*')
            .eq('donor_id', req.user.id)
            .order('donation_date', { ascending: false });

        if (donationsError) {
            console.error('Error fetching donations:', donationsError);
            return res.status(400).json({ error: donationsError.message });
        }

        // Calculate stats from actual donations
        const completedDonations = allDonations.filter(d => d.status === 'completed' && d.admin_approved === true);
        const pendingDonations = allDonations.filter(d => d.status === 'pending_admin_approval');
        
        const totalDonations = completedDonations.length;
        const totalUnits = completedDonations.reduce((sum, d) => sum + (d.units_donated || 1), 0);
        const lastDonation = completedDonations[0];
        const lastDonationDate = lastDonation ? lastDonation.donation_date : null;
        
        // Calculate next eligible date (56 days after last donation)
        let nextEligibleDate = null;
        if (lastDonationDate) {
            const lastDate = new Date(lastDonationDate);
            const nextDate = new Date(lastDate);
            nextDate.setDate(nextDate.getDate() + 56); // 8 weeks buffer period
            nextEligibleDate = nextDate.toISOString().split('T')[0];
        }

        const stats = {
            donor_id: req.user.id,
            total_donations: totalDonations,
            total_units: totalUnits,
            last_donation_date: lastDonationDate,
            next_eligible_date: nextEligibleDate,
            pending_approvals: pendingDonations.length,
            latest_risk_score: 0,
            eligibility_status: pendingDonations.length > 0 ? 'pending_review' : 'eligible',
            donationHistory: allDonations,
            pendingDonations: pendingDonations
        };

        console.log('✅ Enhanced stats calculated for donor:', req.user.id, {
            total_donations: stats.total_donations,
            pending_approvals: stats.pending_approvals
        });

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('Get enhanced donor stats error:', error);
        res.status(500).json({ error: 'Failed to fetch donor statistics' });
    }
});

// Risk calculation helper function
function calculateRiskScore(basicInfo, medicalData, healthConditions) {
    let riskScore = 0;

    // Age risk factors
    const age = parseInt(basicInfo.age);
    if (age < 18 || age > 65) riskScore += 30;
    else if (age < 21 || age > 60) riskScore += 15;

    // Weight risk factors
    const weight = parseFloat(basicInfo.weight);
    if (weight < 50) riskScore += 25;
    else if (weight < 55) riskScore += 10;

    // Blood pressure risk
    const systolic = parseFloat(medicalData.bloodPressure?.systolic);
    const diastolic = parseFloat(medicalData.bloodPressure?.diastolic);
    if (systolic > 140 || systolic < 90 || diastolic > 90 || diastolic < 60) {
        riskScore += 20;
    }

    // Hemoglobin risk
    const hemoglobin = parseFloat(medicalData.hemoglobin);
    if (hemoglobin < 12.5) riskScore += 25;
    else if (hemoglobin < 13.0) riskScore += 10;

    // Heart rate risk
    const heartRate = parseFloat(medicalData.heartRate);
    if (heartRate < 50 || heartRate > 100) riskScore += 15;

    // Temperature risk
    const temperature = parseFloat(medicalData.temperature);
    if (temperature > 37.5 || temperature < 36.0) riskScore += 20;

    // Health conditions risk
    if (healthConditions.recentIllness) riskScore += 15;
    if (healthConditions.chronicConditions) riskScore += 20;
    if (healthConditions.currentMedications) riskScore += 10;
    if (healthConditions.allergies) riskScore += 5;

    // Last donation date risk
    if (basicInfo.lastDonationDate) {
        const daysSinceLastDonation = Math.floor(
            (new Date() - new Date(basicInfo.lastDonationDate)) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLastDonation < 56) riskScore += 30; // Too soon
    }

    return Math.min(Math.round(riskScore), 100); // Cap at 100%
}

// Risk flags generation helper function
function generateRiskFlags(basicInfo, medicalData, healthConditions) {
    const flags = [];

    const age = parseInt(basicInfo.age);
    const weight = parseFloat(basicInfo.weight);
    const systolic = parseFloat(medicalData.bloodPressure?.systolic);
    const diastolic = parseFloat(medicalData.bloodPressure?.diastolic);
    const hemoglobin = parseFloat(medicalData.hemoglobin);
    const heartRate = parseFloat(medicalData.heartRate);
    const temperature = parseFloat(medicalData.temperature);

    if (age < 18 || age > 65) {
        flags.push({ type: 'age', severity: 'high', message: 'Age outside safe donation range' });
    }

    if (weight < 50) {
        flags.push({ type: 'weight', severity: 'high', message: 'Weight below minimum requirement' });
    }

    if (systolic > 140 || diastolic > 90) {
        flags.push({ type: 'blood_pressure', severity: 'high', message: 'High blood pressure' });
    }

    if (systolic < 90 || diastolic < 60) {
        flags.push({ type: 'blood_pressure', severity: 'medium', message: 'Low blood pressure' });
    }

    if (hemoglobin < 12.5) {
        flags.push({ type: 'hemoglobin', severity: 'high', message: 'Low hemoglobin levels' });
    }

    if (heartRate < 50 || heartRate > 100) {
        flags.push({ type: 'heart_rate', severity: 'medium', message: 'Abnormal heart rate' });
    }

    if (temperature > 37.5) {
        flags.push({ type: 'temperature', severity: 'high', message: 'Elevated body temperature' });
    }

    if (healthConditions.recentIllness) {
        flags.push({ type: 'health', severity: 'medium', message: 'Recent illness reported' });
    }

    if (healthConditions.chronicConditions) {
        flags.push({ type: 'health', severity: 'high', message: 'Chronic health conditions' });
    }

    if (basicInfo.lastDonationDate) {
        const daysSinceLastDonation = Math.floor(
            (new Date() - new Date(basicInfo.lastDonationDate)) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLastDonation < 56) {
            flags.push({ 
                type: 'donation_frequency', 
                severity: 'high', 
                message: `Too soon since last donation (${daysSinceLastDonation} days ago, minimum 56 days required)` 
            });
        }
    }

    return flags;
}

// Additional Admin Analytics Endpoints

// Get detailed user analytics
app.get('/api/admin/user-analytics', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Process analytics data
        const analytics = {
            totalUsers: users.length,
            usersByType: {
                admin: users.filter(u => u.user_type === 'admin').length,
                donor: users.filter(u => u.user_type === 'donor').length,
                recipient: users.filter(u => u.user_type === 'recipient').length
            },
            recentRegistrations: users.filter(u => {
                const registrationDate = new Date(u.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return registrationDate > weekAgo;
            }).length,
            bloodGroupDistribution: {}
        };

        // Calculate blood group distribution
        users.forEach(user => {
            if (user.blood_group) {
                analytics.bloodGroupDistribution[user.blood_group] = 
                    (analytics.bloodGroupDistribution[user.blood_group] || 0) + 1;
            }
        });

        res.json({ success: true, analytics });

    } catch (error) {
        console.error('User analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch user analytics' });
    }
});

// Get donation analytics
app.get('/api/admin/donation-analytics', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { data: donations, error } = await supabase
            .from('donations')
            .select('*')
            .order('donation_date', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const analytics = {
            totalDonations: donations.length,
            completedDonations: donations.filter(d => d.status === 'completed').length,
            pendingDonations: donations.filter(d => d.status === 'pending_admin_approval').length,
            rejectedDonations: donations.filter(d => d.status === 'rejected').length,
            totalUnits: donations.reduce((sum, d) => sum + (d.units_donated || 0), 0),
            approvalRate: donations.length > 0 ? 
                (donations.filter(d => d.status === 'completed').length / donations.length * 100).toFixed(1) : 0,
            recentDonations: donations.filter(d => {
                const donationDate = new Date(d.donation_date || d.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return donationDate > weekAgo;
            }).length
        };

        res.json({ success: true, analytics });

    } catch (error) {
        console.error('Donation analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch donation analytics' });
    }
});

// Get inventory analytics
app.get('/api/admin/inventory-analytics', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { data: inventory, error } = await supabase
            .from('blood_inventory')
            .select('*');

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const today = new Date();
        const analytics = {
            totalUnits: inventory.reduce((sum, item) => sum + item.units_available, 0),
            totalBatches: inventory.length,
            expiringUnits: inventory.filter(item => {
                const expiryDate = new Date(item.expiry_date);
                const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                return daysRemaining > 0 && daysRemaining <= 7;
            }).reduce((sum, item) => sum + item.units_available, 0),
            expiredUnits: inventory.filter(item => {
                const expiryDate = new Date(item.expiry_date);
                return expiryDate < today;
            }).reduce((sum, item) => sum + item.units_available, 0),
            bloodGroupBreakdown: {}
        };

        // Calculate blood group breakdown
        inventory.forEach(item => {
            if (!analytics.bloodGroupBreakdown[item.blood_group]) {
                analytics.bloodGroupBreakdown[item.blood_group] = {
                    totalUnits: 0,
                    batches: 0,
                    availableUnits: 0,
                    expiringUnits: 0,
                    expiredUnits: 0
                };
            }

            const group = analytics.bloodGroupBreakdown[item.blood_group];
            group.totalUnits += item.units_available;
            group.batches += 1;

            const expiryDate = new Date(item.expiry_date);
            const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

            if (daysRemaining < 0) {
                group.expiredUnits += item.units_available;
            } else if (daysRemaining <= 7) {
                group.expiringUnits += item.units_available;
            } else {
                group.availableUnits += item.units_available;
            }
        });

        res.json({ success: true, analytics });

    } catch (error) {
        console.error('Inventory analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory analytics' });
    }
});

// Update user status (activate/deactivate)
app.post('/api/admin/update-user-status/:userId', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { userId } = req.params;
        const { isActive } = req.body;

        const { data, error } = await supabase
            .from('users')
            .update({ is_active: isActive })
            .eq('id', userId)
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ 
            success: true, 
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            user: data[0]
        });

    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// Get system health status
app.get('/api/admin/system-health', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Check database connectivity
        const { data: healthCheck, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        const health = {
            database: error ? 'error' : 'healthy',
            api: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        };

        res.json({ success: true, health });

    } catch (error) {
        console.error('System health error:', error);
        res.status(500).json({ 
            success: false, 
            health: {
                database: 'error',
                api: 'error',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Start server
// Debug endpoint to check blood inventory status
app.get('/api/debug/blood-inventory', async (req, res) => {
    try {
        console.log('=== DEBUG: Checking blood inventory ===');
        
        const { data: inventory, error } = await supabase
            .from('blood_inventory')
            .select('*')
            .order('last_updated', { ascending: false });

        if (error) {
            console.error('Debug inventory fetch error:', error);
            throw error;
        }

        console.log('Current blood inventory:', inventory);

        res.json({
            success: true,
            count: inventory?.length || 0,
            inventory: inventory || [],
            message: inventory?.length ? `Found ${inventory.length} inventory entries` : 'No inventory entries found',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Debug inventory error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch inventory',
            details: error.message 
        });
    }
});

// Debug endpoint for testing frontend connection (no auth required)
app.get('/api/debug/blood-inventory-public', async (req, res) => {
    try {
        console.log('=== PUBLIC DEBUG: Frontend connection test ===');
        
        const { data: inventory, error } = await supabase
            .from('blood_inventory')
            .select('id, blood_group, units_available, location, expiry_date, last_updated')
            .order('last_updated', { ascending: false });

        if (error) {
            console.error('Public debug inventory fetch error:', error);
            throw error;
        }

        console.log('📱 Frontend connection test - inventory count:', inventory?.length || 0);

        res.json({
            success: true,
            message: 'Frontend connection working!',
            count: inventory?.length || 0,
            inventory: inventory || [],
            testTime: new Date().toISOString(),
            // Format for frontend display
            formattedInventory: inventory?.map(item => ({
                bloodGroup: item.blood_group,
                units: item.units_available,
                location: item.location,
                expiryDate: item.expiry_date,
                lastUpdated: item.last_updated
            })) || []
        });
    } catch (error) {
        console.error('Public debug error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch inventory',
            details: error.message 
        });
    }
});

// Debug endpoint to check all donations
app.get('/api/debug/donations', async (req, res) => {
    try {
        console.log('=== DEBUG: Checking all donations ===');
        
        const { data: donations, error } = await supabase
            .from('donations')
            .select(`
                *,
                users!donor_id(full_name, blood_group, email)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Debug donations fetch error:', error);
            throw error;
        }

        console.log('Current donations:', donations);

        res.json({
            success: true,
            count: donations?.length || 0,
            donations: donations || [],
            message: donations?.length ? `Found ${donations.length} donations` : 'No donations found',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Debug donations error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch donations',
            details: error.message 
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🩸 Blood Bank API Server running on port ${PORT}`);
    console.log(`🌐 Server accessible at: http://192.168.29.237:${PORT}`);
    console.log(`🔗 Supabase URL: ${supabaseUrl}`);
});

module.exports = app;
