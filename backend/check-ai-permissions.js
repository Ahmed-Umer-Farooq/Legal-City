const db = require('./db');

async function checkAIPermissions() {
  console.log('🔍 Checking AI permissions in database...\n');

  try {
    // Check if there are any permissions related to AI
    const aiPermissions = await db('permissions')
      .where('resource', 'like', '%ai%')
      .orWhere('name', 'like', '%ai%');

    console.log('AI-related permissions:', aiPermissions);

    // Check role permissions
    const rolePerms = await db('role_permissions')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .join('roles', 'role_permissions.role_id', 'roles.id')
      .where('permissions.resource', 'like', '%ai%')
      .select('roles.name as role', 'permissions.name as permission', 'permissions.action', 'permissions.resource');

    console.log('\nRole-based AI permissions:', rolePerms);

    // Check lawyer plan restrictions
    const lawyers = await db('lawyers')
      .select('id', 'name', 'email', 'subscription_tier', 'plan_restrictions')
      .limit(5);

    console.log('\nSample lawyer restrictions:');
    lawyers.forEach(lawyer => {
      console.log(`\nLawyer: ${lawyer.name} (${lawyer.email})`);
      console.log(`Tier: ${lawyer.subscription_tier}`);
      if (lawyer.plan_restrictions) {
        const restrictions = JSON.parse(lawyer.plan_restrictions);
        console.log(`AI Analyzer: ${restrictions.ai_analyzer ? '✅ Allowed' : '❌ Blocked'}`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
  }
}

checkAIPermissions();
