/** Practice-safe MCQ fields for exam sessions (no answers). */
export function toPracticeMcqShape(mcq) {
  if (!mcq || typeof mcq !== 'object') return null;
  const id = mcq._id ?? mcq.id;
  if (!id) return null;
  const options = Array.isArray(mcq.options)
    ? mcq.options.map((o) => ({
        label: String(o?.label ?? ''),
        text: String(o?.text ?? ''),
      }))
    : [];
  return {
    _id: id,
    questionStem: String(mcq.questionStem ?? ''),
    options,
  };
}

export function toPracticeMcqList(mcqs) {
  if (!Array.isArray(mcqs)) return [];
  return mcqs.map(toPracticeMcqShape).filter(Boolean);
}
