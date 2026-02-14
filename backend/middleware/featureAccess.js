const db = require('../db');

// DEPLOYMENT MODE: BYPASS ALL RESTRICTIONS
const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    console.log(`✅ DEPLOYMENT MODE: Bypassing ${featureName} restrictions`);
    return next();
  };
};

module.exports = { checkFeatureAccess };