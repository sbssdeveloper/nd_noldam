import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPostMain() {
  console.log('Seeding Main Posts...');

  const posts = [
    {
      content: JSON.stringify([
        {type: "text", id: "title-1", content: "오늘의 운동 루틴"},
        {type: "text", id: "text-1", content: "새벽 6시에 일어나서 조깅을 했습니다. 상쾌한 아침 공기를 마시며 뛰는 기분이 정말 좋네요!"},
        {type: "image", id: "img-1", url: "/images/post1.jpg", filename: "post1.jpg", file: {}}
      ]),
    
      isPublic: true,
      userId: 1,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-2", content: "새로운 프로젝트 시작!"},
        {type: "text", id: "text-2", content: "오늘부터 @sarah_jones와 함께 새로운 웹 개발 프로젝트를 시작했습니다. 정말 기대되네요!"},
        {type: "image", id: "img-2", url: "/images/post2.jpg", filename: "post2.jpg", file: {}}
      ]),
      
      isPublic: true,
      userId: 1,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-3", content: "맛있는 저녁 식사"},
        {type: "text", id: "text-3", content: "오늘은 집에서 파스타를 만들어 먹었습니다. 정말 맛있었어요!"},
        {type: "image", id: "img-3", url: "/images/post3.jpg", filename: "post3.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 1,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-4", content: "친구들과의 모임"},
        {type: "text", id: "text-4", content: "오랜만에 @jane_smith @mike_wilson와 만나서 즐거운 시간을 보냈습니다. 웃음이 끊이지 않는 하루였어요!"},
        {type: "image", id: "img-4", url: "/images/post4.jpg", filename: "post4.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 1,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-5", content: "독서의 즐거움"},
        {type: "text", id: "text-5", content: "새로 산 책을 읽고 있습니다. 정말 재미있네요!"},
        {type: "image", id: "img-5", url: "/images/post5.jpg", filename: "post5.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 1,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-6", content: "맛있는 브런치"},
        {type: "text", id: "text-6", content: "주말 브런치를 먹으러 갔습니다. 아보카도 토스트와 프레쉬 오렌지 주스가 정말 맛있었어요!"},
        {type: "image", id: "img-6", url: "/images/post6.jpg", filename: "post6.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 2,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-7", content: "도서관에서 공부"},
        {type: "text", id: "text-7", content: "조용한 도서관에서 집중해서 공부했습니다. 새로운 지식을 배우는 기분이 정말 좋네요!"},
        {type: "image", id: "img-7", url: "/images/post7.jpg", filename: "post7.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 3,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-8", content: "친구들과의 모임"},
        {type: "text", id: "text-8", content: "오랜만에 친구들과 만나서 즐거운 시간을 보냈습니다. 웃음이 끊이지 않는 하루였어요!"},
        {type: "image", id: "img-8", url: "/images/post8.jpg", filename: "post8.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 4,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-9", content: "일몰 감상"},
        {type: "text", id: "text-9", content: "해질 무렵 바닷가에서 일몰을 감상했습니다. 정말 아름다운 순간이었어요!"},
        {type: "image", id: "img-9", url: "/images/post9.jpg", filename: "post9.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 5,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-10", content: "요가 클래스"},
        {type: "text", id: "text-10", content: "요즘 요가를 시작했습니다. 몸과 마음이 편안해지는 기분이에요!"},
        {type: "image", id: "img-10", url: "/images/post10.jpg", filename: "post10.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 2,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-11", content: "맛있는 디저트"},
        {type: "text", id: "text-11", content: "새로 오픈한 카페에서 맛있는 케이크를 먹었습니다. 달콤한 맛이 정말 좋았어요!"},
        {type: "image", id: "img-11", url: "/images/post7.jpg", filename: "post7.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 3,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-12", content: "산책길에서"},
        {type: "text", id: "text-12", content: "공원에서 산책을 하며 자연을 감상했습니다. 새소리와 바람소리가 정말 평화로웠어요!"},
        {type: "image", id: "img-12", url: "/images/post8.jpg", filename: "post8.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 2,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-13", content: "새로운 책"},
        {type: "text", id: "text-13", content: "서점에서 새로운 책을 샀습니다. 읽기 시작하니 정말 재미있네요!"},
        {type: "image", id: "img-13", url: "/images/post9.jpg", filename: "post9.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 1,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-14", content: "요리 실험"},
        {type: "text", id: "text-14", content: "새로운 레시피로 요리를 해봤습니다. 결과가 생각보다 좋았어요!"},
        {type: "image", id: "img-14", url: "/images/post10.jpg", filename: "post10.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 3,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-15", content: "운동 후 스트레칭"},
        {type: "text", id: "text-15", content: "운동 후 스트레칭을 하며 몸을 풀어줬습니다. 근육이 부드러워지는 기분이에요!"},
        {type: "image", id: "img-15", url: "/images/post11.jpg", filename: "post11.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 2,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-16", content: "커피 한 잔"},
        {type: "text", id: "text-16", content: "아침에 마시는 커피 한 잔이 정말 좋습니다. 하루를 시작하는 에너지가 되네요!"},
        {type: "image", id: "img-16", url: "/images/post12.jpg", filename: "post12.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 1,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-17", content: "새로운 도전"},
        {type: "text", id: "text-17", content: "새로운 도전을 시작했습니다. 두렵지만 설레는 마음이에요!"},
        {type: "image", id: "img-17", url: "/images/post13.jpg", filename: "post13.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 3,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-18", content: "휴식의 시간"},
        {type: "text", id: "text-18", content: "바쁜 일상 속에서 잠시 휴식을 취했습니다. 마음의 여유가 생기는 기분이에요!"},
        {type: "image", id: "img-18", url: "/images/post14.jpg", filename: "post14.jpg", file: {}}
      ]),

      isPublic: true,
      userId: 2,
    },
    {
      content: JSON.stringify([
        {type: "text", id: "title-19", content: "감사한 하루"},
        {type: "text", id: "text-19", content: "오늘 하루도 감사한 마음으로 마무리합니다. 작은 것들에도 감사할 줄 아는 마음이 중요해요!"},
        {type: "image", id: "img-19", url: "/images/post15.jpg", filename: "post15.jpg", file: {}}
      ]),
      imageUrl: '/images/post15.jpg',
      isPublic: true,
      userId: 1,
    },
  ];

  for (const post of posts) {
    await prisma.post.create({
      data: post,
    });
  }

  console.log('Main Posts seeded successfully!');
}
