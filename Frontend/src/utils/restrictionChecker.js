// DEPLOYMENT MODE: ALL RESTRICTIONS BYPASSED
export const checkFeatureAccess = (featureName, lawyer) => {
  console.log(`🚀 DEPLOYMENT MODE: Allowing access to ${featureName}`);
  return { 
    allowed: true,
    reason: 'deployment_mode',
    message: 'All features enabled for deployment'
  };
};

export const getRestrictionMessage = (reason, requiredTier) => {
  return 'All features are available during deployment.';
};

// Get all available features for plan restrictions
export const getAllFeatures = () => {
  return [
    'home', 'quick_actions', 'messages', 'contacts', 'calendar', 'payment_records',
    'tasks', 'documents', 'reports', 'blogs', 'forms', 'payouts', 'payment_links',
    'cases', 'clients', 'qa_answers', 'ai_analyzer', 'profile', 'subscription'
  ];
};
