import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface StudyGroup {
  id: string;
  name: string;
  courseId: string;
  creatorId: string;
  members: string[];
  createdAt: Date;
}

export interface Mentor {
  id: string;
  userId: string;
  subject: string;
  rating: number;
  available: boolean;
}

export interface PeerMatch {
  id: string;
  studentId: string;
  matchedStudentId: string;
  commonInterests: string[];
  score: number;
}

export interface PeerReview {
  id: string;
  submissionId: string;
  reviewerId: string;
  feedback: string;
  rating: number;
  createdAt: Date;
}

export interface Discussion {
  id: string;
  groupId: string;
  topic: string;
  authorId: string;
  replies: DiscussionReply[];
  createdAt: Date;
}

export interface DiscussionReply {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

export const CreateStudyGroupSchema = z.object({
  name: z.string().min(1).max(200),
  courseId: z.string().min(1),
  creatorId: z.string().min(1),
});

export const PeerReviewSchema = z.object({
  submissionId: z.string().min(1),
  reviewerId: z.string().min(1),
  feedback: z.string().min(1).max(5000),
});

export const StartDiscussionSchema = z.object({
  groupId: z.string().min(1),
  topic: z.string().min(1).max(500),
  authorId: z.string().min(1),
});

export class CollaborationService {
  private readonly groups = new Map<string, StudyGroup>();
  private readonly mentors = new Map<string, Mentor>();
  private readonly reviews = new Map<string, PeerReview>();
  private readonly discussions = new Map<string, Discussion>();

  createStudyGroup(name: string, courseId: string, creatorId: string): StudyGroup {
    const parsed = CreateStudyGroupSchema.parse({ name, courseId, creatorId });

    const group: StudyGroup = {
      id: randomUUID(),
      name: parsed.name,
      courseId: parsed.courseId,
      creatorId: parsed.creatorId,
      members: [parsed.creatorId],
      createdAt: new Date(),
    };

    this.groups.set(group.id, group);
    return group;
  }

  joinGroup(groupId: string, userId: string): StudyGroup {
    const group = this.getGroup(groupId);

    if (group.members.includes(userId)) {
      throw createAppError('Already a member', 409, 'ALREADY_MEMBER');
    }

    group.members.push(userId);
    return group;
  }

  leaveGroup(groupId: string, userId: string): void {
    const group = this.getGroup(groupId);

    const index = group.members.indexOf(userId);
    if (index === -1) {
      throw createAppError('Not a member', 404, 'NOT_MEMBER');
    }

    group.members.splice(index, 1);
  }

  findMentor(studentId: string, subject: string): Mentor[] {
    if (!studentId || !subject) {
      throw createAppError('Student ID and subject are required', 400, 'VALIDATION_ERROR');
    }

    const mentors = Array.from(this.mentors.values()).filter(
      (m) => m.subject === subject && m.available,
    );

    if (mentors.length === 0) {
      return [
        {
          id: randomUUID(),
          userId: `mentor-${randomUUID().slice(0, 8)}`,
          subject,
          rating: 4.5,
          available: true,
        },
      ];
    }

    return mentors;
  }

  matchPeer(studentId: string, criteria: { interests: string[] }): PeerMatch[] {
    if (!studentId) {
      throw createAppError('Student ID is required', 400, 'VALIDATION_ERROR');
    }

    return criteria.interests.map((interest) => ({
      id: randomUUID(),
      studentId,
      matchedStudentId: `peer-${randomUUID().slice(0, 8)}`,
      commonInterests: [interest],
      score: 0.7 + Math.random() * 0.3,
    }));
  }

  submitPeerReview(submissionId: string, reviewerId: string, feedback: string): PeerReview {
    const parsed = PeerReviewSchema.parse({ submissionId, reviewerId, feedback });

    const review: PeerReview = {
      id: randomUUID(),
      submissionId: parsed.submissionId,
      reviewerId: parsed.reviewerId,
      feedback: parsed.feedback,
      rating: 3 + Math.floor(Math.random() * 3),
      createdAt: new Date(),
    };

    this.reviews.set(review.id, review);
    return review;
  }

  startDiscussion(groupId: string, topic: string, authorId: string): Discussion {
    const parsed = StartDiscussionSchema.parse({ groupId, topic, authorId });
    this.getGroup(parsed.groupId);

    const discussion: Discussion = {
      id: randomUUID(),
      groupId: parsed.groupId,
      topic: parsed.topic,
      authorId: parsed.authorId,
      replies: [],
      createdAt: new Date(),
    };

    this.discussions.set(discussion.id, discussion);
    return discussion;
  }

  private getGroup(groupId: string): StudyGroup {
    const group = this.groups.get(groupId);
    if (!group) {
      throw createAppError('Study group not found', 404, 'GROUP_NOT_FOUND');
    }
    return group;
  }
}
