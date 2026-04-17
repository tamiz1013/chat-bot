const PLAN_LIMITS = {
  free: { bots: 1, knowledgeEntries: 5, messagesPerMonth: 500 },
  pro: { bots: 5, knowledgeEntries: 50, messagesPerMonth: 10000 },
  enterprise: { bots: 999, knowledgeEntries: 500, messagesPerMonth: 100000 },
};

module.exports = PLAN_LIMITS;
