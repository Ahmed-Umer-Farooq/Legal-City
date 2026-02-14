// Centralized restriction checker for lawyer dashboard
// DEMO MODE: All restrictions disabled for client preview
export const checkFeatureAccess = (featureName, lawyer) => {
  // Allow all features for demo
  return { allowed: true };
};

export const getRestrictionMessage = (reason, requiredTier) => {
  switch (reason) {
    case 'profile_loading':
      return 'Loading your profile...';
    case 'verification_required':
      return 'This feature requires account verification. Please verify your account to continue.';
    case 'subscription_required':
      return `This feature requires a ${requiredTier === 'premium' ? 'Premium' : 'Professional'} subscription. Upgrade to unlock.`;
    default:
      return 'Access denied';
  }
};

// Get all available features for plan restrictions
export const getAllFeatures = () => {
  return [
    'home', 'quick_actions', 'messages', 'contacts', 'calendar', 'payment_records',
    'tasks', 'documents', 'reports', 'blogs', 'forms', 'payouts', 'payment_links',
    'cases', 'clients', 'qa_answers', 'ai_analyzer', 'profile', 'subscription'
  ];
};
