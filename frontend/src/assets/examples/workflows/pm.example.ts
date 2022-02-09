export const pmExample =
  `- workflow: Study Right

- service: StudyGuide

- data: Student carli
  motivation: 83
  stops: "[stop1]"
  stops.back: student

- data: Stop stop1
  motivation: 66
  student: carli
  room: r1
  room.back: "[stops]"

- data: Room r1
  topic: math
  credits: 17
  stop: stop1
  neighbors: "[r2, r4]"
  neighbors.back: "[neighbors]"

- data: Room r2
  topic: calculus
  credits: 20
  neighbors: "[r1, r4]"

- data: Room r3
  topic: exam
  neighbors: "[r4]"

- data: Room r4
  topic: modeling
  credits: 29
  neighbors: "[r1, r2, r3]"

- command: findRoute

- data: Stop stop2
  room: calculus
  motivation: 56
  prev: stop1
  prev.back: "[next]"

- data: Student carli
  route: "[math, calculus, math, modeling, exam]"
`;
