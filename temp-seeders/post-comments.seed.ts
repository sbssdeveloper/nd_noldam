import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPostComments() {
  console.log('Seeding Post Comments...');

  const comments = [
    // Complex conversation threads for User 1's comments on other posts
    // This will create deep, multi-level conversations
    
    // Post 6 - User 1 comments "브런치 맛있어 보여요! 어디서 드셨나요?"
    {
      postId: 6,
      userId: 1,
      content: '브런치 맛있어 보여요! 어디서 드셨나요?',
      parentCommentId: null,
      level: 0,
    },
    // User 2 replies to User 1's comment
    {
      postId: 6,
      userId: 2,
      content: '강남에 있는 브런치 카페예요! 정말 맛있더라고요',
      parentCommentId: null, // Will be set to actual ID after creation
      level: 1,
    },
    // User 3 also replies to User 1's comment
    {
      postId: 6,
      userId: 3,
      content: '저도 그 카페 가봤는데 정말 좋더라고요!',
      parentCommentId: null, // Will be set to actual ID after creation
      level: 1,
    },
    // User 1 replies to User 2's reply
    {
      postId: 6,
      userId: 1,
      content: '아! 그 카페 알고 있어요. 정말 맛있더라고요',
      parentCommentId: null, // Will be set to actual ID after creation
      level: 2,
    },
    // User 4 joins the conversation
    {
      postId: 6,
      userId: 4,
      content: '저도 다음에 가보고 싶어요!',
      parentCommentId: null, // Will be set to actual ID after creation
      level: 2,
    },
    // User 1 replies to User 3's reply
    {
      postId: 6,
      userId: 1,
      content: '다음에 같이 가요!',
      parentCommentId: null, // Will be set to actual ID after creation
      level: 2,
    },
    // User 5 joins the conversation
    {
      postId: 6,
      userId: 5,
      content: '저도 참여하고 싶어요!',
      parentCommentId: null, // Will be set to actual ID after creation
      level: 2,
    },
    // User 2 replies to User 1's nested reply
    {
      postId: 6,
      userId: 2,
      content: '좋아요! 언제 가실 건가요?',
      parentCommentId: null, // Will be set to actual ID after creation
      level: 3,
    },
    // User 1 replies to User 2's nested reply
    {
      postId: 6,
      userId: 1,
      content: '이번 주말에 가볼까요?',
      parentCommentId: null, // Will be set to actual ID after creation
      level: 4,
    },
    // User 3 replies to User 1's deep nested reply
    {
      postId: 6,
      userId: 3,
      content: '저도 주말에 시간 있어요!',
      parentCommentId: null, // Will be set to actual ID after creation
      level: 5,
    },

    // Post 7 - User 1 comments "도서관에서 공부하는 분위기가 정말 좋죠!"
    {
      postId: 7,
      userId: 1,
      content: '도서관에서 공부하는 분위기가 정말 좋죠!',
      parentCommentId: null,
      level: 0,
    },
    // User 2 replies
    {
      postId: 7,
      userId: 2,
      content: '저도 도서관에서 공부하는 걸 좋아해요',
      parentCommentId: null,
      level: 1,
    },
    // User 1 replies to User 2
    {
      postId: 7,
      userId: 1,
      content: '어떤 도서관에서 공부하세요?',
      parentCommentId: null,
      level: 2,
    },
    // User 2 replies to User 1
    {
      postId: 7,
      userId: 2,
      content: '중앙도서관에서 주로 해요',
      parentCommentId: null,
      level: 3,
    },
    // User 1 replies to User 2
    {
      postId: 7,
      userId: 1,
      content: '저도 가끔 가는데 정말 조용하고 좋더라고요',
      parentCommentId: null,
      level: 4,
    },
    // User 3 joins the conversation
    {
      postId: 7,
      userId: 3,
      content: '저는 시립도서관에서 공부해요!',
      parentCommentId: null,
      level: 2,
    },
    // User 1 replies to User 3
    {
      postId: 7,
      userId: 1,
      content: '시립도서관도 좋죠!',
      parentCommentId: null,
      level: 3,
    },

    // Post 8 - User 1 comments "산책하는 시간이 정말 평화로워 보여요!"
    {
      postId: 8,
      userId: 1,
      content: '산책하는 시간이 정말 평화로워 보여요!',
      parentCommentId: null,
      level: 0,
    },
    // User 3 replies
    {
      postId: 8,
      userId: 3,
      content: '저도 산책 좋아해요!',
      parentCommentId: null,
      level: 1,
    },
    // User 1 replies to User 3
    {
      postId: 8,
      userId: 1,
      content: '어느 공원에서 하세요?',
      parentCommentId: null,
      level: 2,
    },
    // User 3 replies to User 1
    {
      postId: 8,
      userId: 3,
      content: '한강공원에서 주로 해요',
      parentCommentId: null,
      level: 3,
    },
    // User 1 replies to User 3
    {
      postId: 8,
      userId: 1,
      content: '저도 한강공원 좋아해요! 다음에 같이 가요',
      parentCommentId: null,
      level: 4,
    },
    // User 4 joins
    {
      postId: 8,
      userId: 4,
      content: '저도 참여하고 싶어요!',
      parentCommentId: null,
      level: 2,
    },
    // User 1 replies to User 4
    {
      postId: 8,
      userId: 1,
      content: '좋아요! 더 많은 사람이 있으면 더 재미있을 것 같아요',
      parentCommentId: null,
      level: 3,
    },

    // Post 9 - User 1 comments "일몰이 정말 아름답네요! 어디서 찍으셨나요?"
    {
      postId: 9,
      userId: 1,
      content: '일몰이 정말 아름답네요! 어디서 찍으셨나요?',
      parentCommentId: null,
      level: 0,
    },
    // User 5 replies
    {
      postId: 9,
      userId: 5,
      content: '바다가 보이는 곳에서 찍었어요!',
      parentCommentId: null,
      level: 1,
    },
    // User 1 replies to User 5
    {
      postId: 9,
      userId: 1,
      content: '정말 멋진 사진이에요!',
      parentCommentId: null,
      level: 2,
    },
    // User 5 replies to User 1
    {
      postId: 9,
      userId: 5,
      content: '감사해요! 저도 일몰 보러 가고 싶어요',
      parentCommentId: null,
      level: 3,
    },
    // User 1 replies to User 5
    {
      postId: 9,
      userId: 1,
      content: '다음에 같이 가요!',
      parentCommentId: null,
      level: 4,
    },
    // User 2 joins
    {
      postId: 9,
      userId: 2,
      content: '저도 사진 찍는 걸 좋아해요!',
      parentCommentId: null,
      level: 1,
    },
    // User 1 replies to User 2
    {
      postId: 9,
      userId: 1,
      content: '어떤 종류의 사진을 찍으세요?',
      parentCommentId: null,
      level: 2,
    },
    // User 2 replies to User 1
    {
      postId: 9,
      userId: 2,
      content: '풍경 사진을 주로 찍어요',
      parentCommentId: null,
      level: 3,
    },

    // Post 10 - User 1 comments "요가 정말 좋죠! 저도 시작한 지 얼마 안 됐어요"
    {
      postId: 10,
      userId: 1,
      content: '요가 정말 좋죠! 저도 시작한 지 얼마 안 됐어요',
      parentCommentId: null,
      level: 0,
    },
    // User 2 replies
    {
      postId: 10,
      userId: 2,
      content: '어디서 배우고 계신가요?',
      parentCommentId: null,
      level: 1,
    },
    // User 1 replies to User 2
    {
      postId: 10,
      userId: 1,
      content: '집에서 유튜브로 배우고 있어요!',
      parentCommentId: null,
      level: 2,
    },
    // User 2 replies to User 1
    {
      postId: 10,
      userId: 2,
      content: '저도 유튜브로 배우고 있어요!',
      parentCommentId: null,
      level: 3,
    },
    // User 1 replies to User 2
    {
      postId: 10,
      userId: 1,
      content: '같이 배워요!',
      parentCommentId: null,
      level: 4,
    },
    // User 3 joins
    {
      postId: 10,
      userId: 3,
      content: '저는 요가원에서 배우고 있어요!',
      parentCommentId: null,
      level: 1,
    },
    // User 1 replies to User 3
    {
      postId: 10,
      userId: 1,
      content: '요가원은 어떤가요?',
      parentCommentId: null,
      level: 2,
    },
    // User 3 replies to User 1
    {
      postId: 10,
      userId: 3,
      content: '선생님이 직접 가르쳐주셔서 정말 좋아요!',
      parentCommentId: null,
      level: 3,
    },
    // User 1 replies to User 3
    {
      postId: 10,
      userId: 1,
      content: '다음에 한번 가보고 싶어요!',
      parentCommentId: null,
      level: 4,
    },
    // User 4 joins
    {
      postId: 10,
      userId: 4,
      content: '저도 요가 시작하고 싶어요!',
      parentCommentId: null,
      level: 1,
    },
    // User 1 replies to User 4
    {
      postId: 10,
      userId: 1,
      content: '함께 시작해요!',
      parentCommentId: null,
      level: 2,
    },
    // User 4 replies to User 1
    {
      postId: 10,
      userId: 4,
      content: '좋아요! 언제부터 시작할까요?',
      parentCommentId: null,
      level: 3,
    },
    // User 1 replies to User 4
    {
      postId: 10,
      userId: 1,
      content: '이번 주부터 시작해볼까요?',
      parentCommentId: null,
      level: 4,
    },
    // User 5 joins
    {
      postId: 10,
      userId: 5,
      content: '저도 참여하고 싶어요!',
      parentCommentId: null,
      level: 1,
    },
    // User 1 replies to User 5
    {
      postId: 10,
      userId: 1,
      content: '더 많은 사람이 있으면 더 재미있을 것 같아요!',
      parentCommentId: null,
      level: 2,
    },
    // User 5 replies to User 1
    {
      postId: 10,
      userId: 5,
      content: '정말 기대돼요!',
      parentCommentId: null,
      level: 3,
    },

    // Additional complex conversations for User 1's own posts
    // These will show up in the "Posts" tab, but we also need replies to them

    // Post 1 - User 1's post with complex replies
    {
      postId: 1,
      userId: 2,
      content: '정말 멋져요! 저도 새벽 운동을 시작해보고 싶어요',
      parentCommentId: null,
      level: 0,
    },
    {
      postId: 1,
      userId: 1,
      content: '처음엔 힘들지만 습관이 되면 정말 좋아요!',
      parentCommentId: null,
      level: 1,
    },
    {
      postId: 1,
      userId: 2,
      content: '어떤 운동부터 시작하면 좋을까요?',
      parentCommentId: null,
      level: 2,
    },
    {
      postId: 1,
      userId: 1,
      content: '조깅이나 홈트레이닝부터 시작해보세요!',
      parentCommentId: null,
      level: 3,
    },
    {
      postId: 1,
      userId: 3,
      content: '저도 6시에 일어나서 운동해요!',
      parentCommentId: null,
      level: 0,
    },
    {
      postId: 1,
      userId: 1,
      content: '와! 정말 대단하세요!',
      parentCommentId: null,
      level: 1,
    },
    {
      postId: 1,
      userId: 3,
      content: '상쾌한 기분이 정말 최고죠',
      parentCommentId: null,
      level: 2,
    },
    {
      postId: 1,
      userId: 1,
      content: '맞아요! 하루를 활기차게 시작할 수 있어요',
      parentCommentId: null,
      level: 3,
    },

    // Post 2 - User 1's post with complex replies
    {
      postId: 2,
      userId: 3,
      content: '어떤 프로젝트인가요? 정말 기대되네요!',
      parentCommentId: null,
      level: 0,
    },
    {
      postId: 2,
      userId: 1,
      content: '웹 개발이요! React와 Next.js를 사용해서 만들어볼 예정이에요',
      parentCommentId: null,
      level: 1,
    },
    {
      postId: 2,
      userId: 3,
      content: '와! 저도 React 공부하고 있어요',
      parentCommentId: null,
      level: 2,
    },
    {
      postId: 2,
      userId: 1,
      content: '좋아요! 같이 공부하면서 서로 도움주고 받아요',
      parentCommentId: null,
      level: 3,
    },
    {
      postId: 2,
      userId: 4,
      content: '저도 참여하고 싶어요!',
      parentCommentId: null,
      level: 0,
    },
    {
      postId: 2,
      userId: 1,
      content: '좋아요! 더 많은 사람이 있으면 더 좋을 것 같아요',
      parentCommentId: null,
      level: 1,
    },
    {
      postId: 2,
      userId: 4,
      content: '어떤 기능을 만들 예정인가요?',
      parentCommentId: null,
      level: 2,
    },
    {
      postId: 2,
      userId: 1,
      content: '소셜 네트워킹 앱을 만들려고 해요',
      parentCommentId: null,
      level: 3,
    },

    // Post 3 - User 1's post with complex replies
    {
      postId: 3,
      userId: 3,
      content: '파스타 레시피 공유해주세요!',
      parentCommentId: null,
      level: 0,
    },
    {
      postId: 3,
      userId: 1,
      content: '네! 간단한 크림 파스타였어요',
      parentCommentId: null,
      level: 1,
    },
    {
      postId: 3,
      userId: 3,
      content: '어떤 재료가 들어가나요?',
      parentCommentId: null,
      level: 2,
    },
    {
      postId: 3,
      userId: 1,
      content: '파스타면, 크림, 버터, 마늘, 파마산 치즈가 기본이에요',
      parentCommentId: null,
      level: 3,
    },
    {
      postId: 3,
      userId: 4,
      content: '저도 만들어봤는데 정말 맛있어요!',
      parentCommentId: null,
      level: 0,
    },
    {
      postId: 3,
      userId: 1,
      content: '와! 어떤 버전으로 만드셨어요?',
      parentCommentId: null,
      level: 1,
    },
    {
      postId: 3,
      userId: 4,
      content: '베이컨도 넣어서 만들어봤어요',
      parentCommentId: null,
      level: 2,
    },
    {
      postId: 3,
      userId: 1,
      content: '오! 베이컨 넣으면 더 맛있을 것 같아요',
      parentCommentId: null,
      level: 3,
    },

    // Post 4 - User 1's post with complex replies
    {
      postId: 4,
      userId: 2,
      content: '친구들과 만나는 시간이 정말 소중하죠!',
      parentCommentId: null,
      level: 0,
    },
    {
      postId: 4,
      userId: 1,
      content: '네! 오랜만에 만나서 정말 즐거웠어요',
      parentCommentId: null,
      level: 1,
    },
    {
      postId: 4,
      userId: 2,
      content: '어디서 만나셨나요?',
      parentCommentId: null,
      level: 2,
    },
    {
      postId: 4,
      userId: 1,
      content: '강남에 있는 카페에서 만났어요!',
      parentCommentId: null,
      level: 3,
    },
    {
      postId: 4,
      userId: 3,
      content: '저도 친구들 만나고 싶어요',
      parentCommentId: null,
      level: 0,
    },
    {
      postId: 4,
      userId: 1,
      content: '다음에 같이 만나요!',
      parentCommentId: null,
      level: 1,
    },
    {
      postId: 4,
      userId: 3,
      content: '좋아요! 언제 만날까요?',
      parentCommentId: null,
      level: 2,
    },
    {
      postId: 4,
      userId: 1,
      content: '이번 주말에 만나볼까요?',
      parentCommentId: null,
      level: 3,
    },

    // Post 5 - User 1's post with complex replies
    {
      postId: 5,
      userId: 2,
      content: '어떤 책을 읽고 계신가요?',
      parentCommentId: null,
      level: 0,
    },
    {
      postId: 5,
      userId: 1,
      content: '자기계발서예요! 정말 도움이 많이 되네요',
      parentCommentId: null,
      level: 1,
    },
    {
      postId: 5,
      userId: 2,
      content: '어떤 자기계발서인가요?',
      parentCommentId: null,
      level: 2,
    },
    {
      postId: 5,
      userId: 1,
      content: '"원씽"이라는 책이에요. 집중력에 관한 내용이에요',
      parentCommentId: null,
      level: 3,
    },
    {
      postId: 5,
      userId: 3,
      content: '저도 책 읽는 걸 좋아해요!',
      parentCommentId: null,
      level: 0,
    },
    {
      postId: 5,
      userId: 1,
      content: '어떤 장르를 좋아하세요?',
      parentCommentId: null,
      level: 1,
    },
    {
      postId: 5,
      userId: 3,
      content: '소설과 에세이를 주로 읽어요',
      parentCommentId: null,
      level: 2,
    },
    {
      postId: 5,
      userId: 1,
      content: '좋은 선택이에요!',
      parentCommentId: null,
      level: 3,
    },
  ];

  // Create comments in batches to establish proper parent-child relationships
  const createdComments: any[] = [];
  
  // First, create all top-level comments (level 0)
  for (const comment of comments) {
    if (comment.level === 0) {
      const createdComment = await prisma.postComment.create({
        data: {
          postId: comment.postId,
          userId: comment.userId,
          content: comment.content,
          parentCommentId: null,
          level: 0,
        },
      });
      createdComments.push(createdComment);
    }
  }
  
  // Then create level 1 comments (replies to top-level)
  for (const comment of comments) {
    if (comment.level === 1) {
      // Find the parent comment (top-level comment on the same post)
      const parentComment = createdComments.find(c => c.postId === comment.postId && c.level === 0);
      if (parentComment) {
        const createdComment = await prisma.postComment.create({
          data: {
            postId: comment.postId,
            userId: comment.userId,
            content: comment.content,
            parentCommentId: parentComment.id,
            level: 1,
          },
        });
        createdComments.push(createdComment);
      }
    }
  }
  
  // Then create level 2 comments (replies to level 1)
  for (const comment of comments) {
    if (comment.level === 2) {
      // Find the parent comment (level 1 comment on the same post)
      const parentComment = createdComments.find(c => c.postId === comment.postId && c.level === 1);
      if (parentComment) {
        const createdComment = await prisma.postComment.create({
          data: {
            postId: comment.postId,
            userId: comment.userId,
            content: comment.content,
            parentCommentId: parentComment.id,
            level: 2,
          },
        });
        createdComments.push(createdComment);
      }
    }
  }
  
  // Continue with deeper levels...
  for (let level = 3; level <= 5; level++) {
    for (const comment of comments) {
      if (comment.level === level) {
        // Find the parent comment (previous level comment on the same post)
        const parentComment = createdComments.find(c => c.postId === comment.postId && c.level === level - 1);
        if (parentComment) {
          const createdComment = await prisma.postComment.create({
            data: {
              postId: comment.postId,
              userId: comment.userId,
              content: comment.content,
              parentCommentId: parentComment.id,
              level: level,
            },
          });
          createdComments.push(createdComment);
        }
      }
    }
  }

  console.log(`Post Comments seeded successfully! Created ${createdComments.length} comments with complex conversation threads.`);
}
