exports.up = function(knex) {
  return knex.schema.alterTable('lawyers', function(table) {
    table.string('subscription_status', 20).alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('lawyers', function(table) {
    table.string('subscription_status', 20).alter();
  });
};
