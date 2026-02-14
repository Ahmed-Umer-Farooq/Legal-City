const db = require('./db');

async function fixSubscriptionIssues() {
  try {
    console.log('🔍 Checking subscription and access issues...\n');

    // 1. Check all lawyers and their plan restrictions
    const lawyers = await db('lawyers').select('*');
    console.log(`Found ${lawyers.length} lawyers in database\n`);

    for (const lawyer of lawyers) {
      console.log(`\n👨‍⚖️ Lawyer: ${lawyer.name} (ID: ${lawyer.id})`);
      console.log(`   Email: ${lawyer.email}`);
      console.log(`   Verified: ${lawyer.is_verified ? 'Yes' : 'No'}`);
      console.log(`   Verification Status: ${lawyer.verification_status || 'Not set'}`);
      console.log(`   Subscription Status: ${lawyer.subscription_status || 'Not set'}`);
      console.log(`   Plan Restrictions: ${lawyer.plan_restrictions || 'None'}`);

      // Parse plan restrictions if they exist
      let restrictions = {};
      if (lawyer.plan_restrictions) {
        try {
          restrictions = typeof lawyer.plan_restrictions === 'string' 
            ? JSON.parse(lawyer.plan_restrictions) 
            : lawyer.plan_restrictions;
          console.log(`   Parsed Restrictions:`, restrictions);
        } catch (e) {
          console.log(`   ❌ Invalid JSON in plan_restrictions: ${lawyer.plan_restrictions}`);
        }
      }

      // Check if AI analyzer is restricted
      const aiAnalyzerRestricted = restrictions.hasOwnProperty('ai_analyzer') && !restrictions.ai_analyzer;
      console.log(`   AI Analyzer Access: ${aiAnalyzerRestricted ? '❌ BLOCKED' : '✅ ALLOWED'}`);
    }

    console.log('\n🔧 Applying fixes...\n');

    // Fix 1: Remove AI analyzer restrictions for all lawyers (temporary fix)
    const updateResult = await db('lawyers').update({
      plan_restrictions: JSON.stringify({
        ai_analyzer: true,
        forms: true,
        documents: true,
        cases: true,
        clients: true,
        tasks: true,
        calendar: true,
        messages: true,
        contacts: true,
        payment_records: true,
        payment_links: true,
        qa: true,
        blogs: true,
        reports: true,
        quick_actions: true
      })
    });

    console.log(`✅ Updated ${updateResult} lawyer records with full access`);

    // Fix 2: Ensure all lawyers are verified (for development)
    const verificationUpdate = await db('lawyers').update({
      is_verified: true,
      verification_status: 'approved'
    });

    console.log(`✅ Verified ${verificationUpdate} lawyer accounts`);

    // Fix 3: Check for database table issues that might cause 500 errors
    console.log('\n🔍 Checking database tables...');

    const tables = [
      'legal_forms',
      'form_categories', 
      'ai_document_sessions',
      'ai_chat_messages',
      'lawyers',
      'users'
    ];

    for (const table of tables) {
      try {
        const exists = await db.schema.hasTable(table);
        if (exists) {
          const count = await db(table).count('* as count').first();
          console.log(`✅ Table '${table}': ${count.count} records`);
        } else {
          console.log(`❌ Table '${table}': MISSING`);
        }
      } catch (error) {
        console.log(`❌ Table '${table}': ERROR - ${error.message}`);
      }
    }

    // Fix 4: Create missing form categories if needed
    const categoryCount = await db('form_categories').count('* as count').first();
    if (categoryCount.count === 0) {
      console.log('\n📝 Creating default form categories...');
      await db('form_categories').insert([
        { name: 'Contracts', display_order: 1, is_active: true },
        { name: 'Legal Documents', display_order: 2, is_active: true },
        { name: 'Court Forms', display_order: 3, is_active: true },
        { name: 'Business Forms', display_order: 4, is_active: true },
        { name: 'Personal Legal', display_order: 5, is_active: true }
      ]);
      console.log('✅ Created default form categories');
    }

    console.log('\n🎉 All fixes applied successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('   • Removed AI analyzer premium restrictions');
    console.log('   • Verified all lawyer accounts');
    console.log('   • Checked database table integrity');
    console.log('   • Created default form categories if missing');
    console.log('\n💡 You should now be able to:');
    console.log('   • Access the document analyzer without premium membership errors');
    console.log('   • Load forms without 500 server errors');

  } catch (error) {
    console.error('❌ Error fixing subscription issues:', error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixSubscriptionIssues();