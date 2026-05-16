import * as taxonomyClient from '../services/taxonomyClient.service.js';

/**
 * Collect all subtopic ids under the given topic ids (taxonomy service).
 * @param {string[]} topicIds
 * @returns {Promise<string[]>}
 */
export async function resolveSubtopicIdsFromTopics(topicIds) {
  const ids = Array.isArray(topicIds)
    ? topicIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  if (ids.length === 0) return [];

  const subtopicIdSet = new Set();
  for (const topicId of ids) {
    const subtopics = await taxonomyClient.listSubtopicsForTopic(topicId);
    for (const sub of subtopics) {
      if (sub?._id != null) subtopicIdSet.add(String(sub._id));
    }
  }
  return Array.from(subtopicIdSet);
}
