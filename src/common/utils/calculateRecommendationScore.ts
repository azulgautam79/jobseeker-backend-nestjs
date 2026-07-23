import { Job } from '../../modules/jobs/schemas/job.schema';
import { User } from '../../modules/users/schemas/user.schema';
import { jaccardSimilarity } from './recommendation.util';

export function calculateRecommendationScore(user: User, job: Job): number {
  let totalWeight = 0;
  let score = 0;

  // Skills
  if (user.skills?.length && job.skills?.length) {
    score += jaccardSimilarity(user.skills, job.skills) * 0.6;
    totalWeight += 0.6;
  }

  // Category
  if (user.preferredCategory && job.category) {
    score += (user.preferredCategory === job.category ? 1 : 0) * 0.15;
    totalWeight += 0.15;
  }

  // Location
  if (user.preferredLocation && job.location) {
    score += (user.preferredLocation === job.location ? 1 : 0) * 0.15;
    totalWeight += 0.15;
  }

  // Experience
  if (user.experience !== undefined && job.experienceRequired !== undefined) {
    const experienceScore =
      user.experience >= job.experienceRequired
        ? 1
        : user.experience / job.experienceRequired;

    score += experienceScore * 0.1;
    totalWeight += 0.1;
  }

  // No data to compare
  if (totalWeight === 0) {
    return 0;
  }

  // Normalize score to 0-1
  return score / totalWeight;
}
