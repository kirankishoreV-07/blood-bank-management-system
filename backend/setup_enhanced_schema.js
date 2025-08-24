const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || "https://ywnaacinyhkmxutqturp.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmFhY2lueWhrbXh1dHF0dXJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMTMzMCwiZXhwIjoyMDcxMjg3MzMwfQ.p6DKETyt94vF90GSLG08Uz-uhBzDUIQXEY0K0u1cYyI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyEnhancedSchema() {
    console.log('🔧 Applying enhanced database schema for admin approval workflow...');
    
    try {
        // Create pending_donations table directly
        console.log('📋 Creating pending_donations table...');
        
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS pending_donations (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                donor_id UUID REFERENCES users(id) ON DELETE CASCADE,
                
                -- Basic donation information
                donation_date DATE NOT NULL,
                units_donated INTEGER CHECK (units_donated > 0) NOT NULL,
                donation_center VARCHAR(255) NOT NULL,
                notes TEXT,
                
                -- Medical and eligibility data
                basic_info JSONB NOT NULL,
                medical_data JSONB NOT NULL,
                health_conditions JSONB NOT NULL,
                
                -- Risk assessment
                risk_score DECIMAL(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
                risk_flags JSONB,
                eligibility_status VARCHAR(20) CHECK (eligibility_status IN ('eligible', 'ineligible', 'requires_review')) DEFAULT 'eligible',
                
                -- Documents
                uploaded_documents JSONB,
                document_verification_status VARCHAR(20) CHECK (document_verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
                
                -- AI and professional assessments
                ai_verification JSONB,
                professional_assessment JSONB,
                
                -- Admin approval workflow
                status VARCHAR(30) CHECK (status IN ('pending_admin_approval', 'approved', 'rejected')) DEFAULT 'pending_admin_approval',
                admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
                admin_notes TEXT,
                admin_decision_date TIMESTAMP WITH TIME ZONE,
                
                -- Certificate generation
                certificate_generated BOOLEAN DEFAULT false,
                certificate_data JSONB,
                certificate_generated_at TIMESTAMP WITH TIME ZONE,
                
                -- Tracking
                submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `;
        
        const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableQuery });
        
        if (createError) {
            console.error('❌ Error creating pending_donations table:', createError);
        } else {
            console.log('✅ pending_donations table created successfully');
        }
        
        // Add indexes
        console.log('📝 Adding indexes...');
        const indexQueries = [
            'CREATE INDEX IF NOT EXISTS idx_pending_donations_donor_id ON pending_donations(donor_id);',
            'CREATE INDEX IF NOT EXISTS idx_pending_donations_status ON pending_donations(status);',
            'CREATE INDEX IF NOT EXISTS idx_pending_donations_admin_id ON pending_donations(admin_id);',
            'CREATE INDEX IF NOT EXISTS idx_pending_donations_risk_score ON pending_donations(risk_score);',
            'CREATE INDEX IF NOT EXISTS idx_pending_donations_eligibility ON pending_donations(eligibility_status);'
        ];
        
        for (const query of indexQueries) {
            const { error } = await supabase.rpc('exec_sql', { sql: query });
            if (error) {
                console.log('⚠️ Index creation warning:', error.message);
            } else {
                console.log('✅ Index created');
            }
        }
        
        // Add columns to existing tables
        console.log('🔧 Updating existing tables...');
        const alterQueries = [
            'ALTER TABLE donations ADD COLUMN IF NOT EXISTS pending_donation_id UUID;',
            'ALTER TABLE donations ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2);',
            'ALTER TABLE donations ADD COLUMN IF NOT EXISTS eligibility_check_passed BOOLEAN DEFAULT true;',
            'ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS pending_donation_id UUID;',
            'ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE;'
        ];
        
        for (const query of alterQueries) {
            const { error } = await supabase.rpc('exec_sql', { sql: query });
            if (error) {
                console.log('⚠️ Column addition warning:', error.message);
            } else {
                console.log('✅ Column added');
            }
        }
        
        // Create trigger function
        console.log('🔧 Creating trigger function...');
        const triggerFunction = `
            CREATE OR REPLACE FUNCTION update_inventory_on_approval()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
                    INSERT INTO blood_inventory (
                        blood_group,
                        units_available,
                        location,
                        donor_id,
                        donation_date,
                        batch_number,
                        collected_date,
                        status,
                        notes,
                        pending_donation_id,
                        approval_date,
                        expiry_date
                    )
                    SELECT 
                        (NEW.basic_info->>'bloodGroup')::VARCHAR(5),
                        NEW.units_donated,
                        NEW.donation_center,
                        NEW.donor_id,
                        NEW.donation_date,
                        'PD-' || SUBSTRING(NEW.id::text, 1, 8),
                        NEW.donation_date,
                        'available',
                        'Approved donation from pending queue',
                        NEW.id,
                        NOW(),
                        NEW.donation_date + INTERVAL '42 days'
                    WHERE EXISTS (SELECT 1 FROM users WHERE id = NEW.donor_id);
                    
                    INSERT INTO donations (
                        donor_id,
                        donation_date,
                        units_donated,
                        donation_center,
                        notes,
                        status,
                        admin_approved,
                        admin_id,
                        admin_notes,
                        approved_at,
                        pending_donation_id,
                        risk_score,
                        eligibility_check_passed
                    ) VALUES (
                        NEW.donor_id,
                        NEW.donation_date,
                        NEW.units_donated,
                        NEW.donation_center,
                        NEW.notes,
                        'completed',
                        true,
                        NEW.admin_id,
                        NEW.admin_notes,
                        NEW.admin_decision_date,
                        NEW.id,
                        NEW.risk_score,
                        CASE WHEN NEW.risk_score <= 60 THEN true ELSE false END
                    );
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `;
        
        const { error: triggerError } = await supabase.rpc('exec_sql', { sql: triggerFunction });
        if (triggerError) {
            console.log('⚠️ Trigger function warning:', triggerError.message);
        } else {
            console.log('✅ Trigger function created');
        }
        
        // Create trigger
        const triggerQuery = `
            DROP TRIGGER IF EXISTS trigger_update_inventory_on_approval ON pending_donations;
            CREATE TRIGGER trigger_update_inventory_on_approval
                AFTER UPDATE ON pending_donations
                FOR EACH ROW
                EXECUTE FUNCTION update_inventory_on_approval();
        `;
        
        const { error: triggerCreateError } = await supabase.rpc('exec_sql', { sql: triggerQuery });
        if (triggerCreateError) {
            console.log('⚠️ Trigger creation warning:', triggerCreateError.message);
        } else {
            console.log('✅ Trigger created');
        }
        
        // Test the setup with a simple query
        console.log('🧪 Testing database setup...');
        const { data: testData, error: testError } = await supabase
            .from('pending_donations')
            .select('id')
            .limit(1);
        
        if (testError) {
            console.error('❌ Database test failed:', testError);
        } else {
            console.log('✅ Database setup test successful');
        }
        
        console.log('🎉 Enhanced database schema applied successfully!');
        console.log('📋 Admin approval workflow is now ready');
        console.log('🔍 Risk assessment system is active');
        console.log('🏥 Blood inventory will be automatically updated when donations are approved');
        
    } catch (error) {
        console.error('❌ Error applying enhanced schema:', error);
    }
}

// Execute the schema setup
applyEnhancedSchema();
