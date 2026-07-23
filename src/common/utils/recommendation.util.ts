// utils/recommendation.util.ts

export function jaccardSimilarity(
  userSkills: string[] = [],
  jobSkills: string[] = [],
): number {
  if (!userSkills.length || !jobSkills.length) return 0;

  const user = new Set(userSkills.map((s) => s.toLowerCase()));
  const job = new Set(jobSkills.map((s) => s.toLowerCase()));

  const intersection = [...user].filter((skill) => job.has(skill));

  const union = new Set([...user, ...job]);

  return intersection.length / union.size;
}
