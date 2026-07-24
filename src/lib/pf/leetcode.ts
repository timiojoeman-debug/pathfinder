/**
 * The NeetCode practice list — 18 categories, 100 problems.
 *
 * Transcribed from the published NeetCode 250 list. Every entry here is a real
 * problem with a real LeetCode number and link; the five categories and 55
 * problems this replaced were invented, which meant the interview page showed
 * students progress bars against a curriculum that did not exist.
 *
 * Category sizes are deliberately uneven (Arrays & Hashing has 13, Tries and
 * Intervals have 1 each) because that is how the list is actually weighted.
 * Do not pad the short ones to make the layout tidier.
 *
 * Problem `slug` is the stable key: it is what the store records as solved, so
 * renaming a category never loses a student's progress.
 */

export type LeetDifficulty = "Easy" | "Medium" | "Hard";

export interface LeetProblem {
  /** Stable identifier and store key. */
  slug: string;
  name: string;
  difficulty: LeetDifficulty;
  /** LeetCode problem number, for students who search by number. */
  number: number;
  url: string;
}

export interface LeetCategory {
  name: string;
  problems: LeetProblem[];
}

export const LEETCODE_CATEGORIES: LeetCategory[] = [
  {
    name: "Arrays & Hashing",
    problems: [
      { slug: "concatenation-of-array", name: "Concatenation of Array", difficulty: "Easy", number: 1929, url: "https://leetcode.com/problems/concatenation-of-array/" },
      { slug: "longest-common-prefix", name: "Longest Common Prefix", difficulty: "Easy", number: 14, url: "https://leetcode.com/problems/longest-common-prefix/" },
      { slug: "remove-element", name: "Remove Element", difficulty: "Easy", number: 27, url: "https://leetcode.com/problems/remove-element/" },
      { slug: "majority-element", name: "Majority Element", difficulty: "Easy", number: 169, url: "https://leetcode.com/problems/majority-element/" },
      { slug: "design-hashset", name: "Design HashSet", difficulty: "Easy", number: 705, url: "https://leetcode.com/problems/design-hashset/" },
      { slug: "design-hashmap", name: "Design HashMap", difficulty: "Easy", number: 706, url: "https://leetcode.com/problems/design-hashmap/" },
      { slug: "sort-an-array", name: "Sort an Array", difficulty: "Medium", number: 912, url: "https://leetcode.com/problems/sort-an-array/" },
      { slug: "sort-colors", name: "Sort Colors", difficulty: "Medium", number: 75, url: "https://leetcode.com/problems/sort-colors/" },
      { slug: "range-sum-query-2d-immutable", name: "Range Sum Query 2D Immutable", difficulty: "Medium", number: 304, url: "https://leetcode.com/problems/range-sum-query-2d-immutable/" },
      { slug: "best-time-to-buy-and-sell-stock-ii", name: "Best Time to Buy And Sell Stock II", difficulty: "Medium", number: 122, url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/" },
      { slug: "majority-element-ii", name: "Majority Element II", difficulty: "Medium", number: 229, url: "https://leetcode.com/problems/majority-element-ii" },
      { slug: "subarray-sum-equals-k", name: "Subarray Sum Equals K", difficulty: "Medium", number: 560, url: "https://leetcode.com/problems/subarray-sum-equals-k/" },
      { slug: "first-missing-positive", name: "First Missing Positive", difficulty: "Hard", number: 41, url: "https://leetcode.com/problems/first-missing-positive/" },
    ],
  },
  {
    name: "Two Pointers",
    problems: [
      { slug: "reverse-string", name: "Reverse String", difficulty: "Easy", number: 344, url: "https://leetcode.com/problems/reverse-string/" },
      { slug: "valid-palindrome-ii", name: "Valid Palindrome II", difficulty: "Easy", number: 680, url: "https://leetcode.com/problems/valid-palindrome-ii/" },
      { slug: "merge-strings-alternately", name: "Merge Strings Alternately", difficulty: "Easy", number: 1768, url: "https://leetcode.com/problems/merge-strings-alternately/" },
      { slug: "merge-sorted-array", name: "Merge Sorted Array", difficulty: "Easy", number: 88, url: "https://leetcode.com/problems/merge-sorted-array/" },
      { slug: "remove-duplicates-from-sorted-array", name: "Remove Duplicates From Sorted Array", difficulty: "Easy", number: 26, url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/" },
      { slug: "4sum", name: "4Sum", difficulty: "Medium", number: 18, url: "https://leetcode.com/problems/4sum/" },
      { slug: "rotate-array", name: "Rotate Array", difficulty: "Medium", number: 189, url: "https://leetcode.com/problems/rotate-array/" },
      { slug: "boats-to-save-people", name: "Boats to Save People", difficulty: "Medium", number: 881, url: "https://leetcode.com/problems/boats-to-save-people/" },
    ],
  },
  {
    name: "Sliding Window",
    problems: [
      { slug: "contains-duplicate-ii", name: "Contains Duplicate II", difficulty: "Easy", number: 219, url: "https://leetcode.com/problems/contains-duplicate-ii/" },
      { slug: "minimum-size-subarray-sum", name: "Minimum Size Subarray Sum", difficulty: "Medium", number: 209, url: "https://leetcode.com/problems/minimum-size-subarray-sum/" },
      { slug: "find-k-closest-elements", name: "Find K Closest Elements", difficulty: "Medium", number: 658, url: "https://leetcode.com/problems/find-k-closest-elements/" },
    ],
  },
  {
    name: "Stack",
    problems: [
      { slug: "baseball-game", name: "Baseball Game", difficulty: "Easy", number: 682, url: "https://leetcode.com/problems/baseball-game/" },
      { slug: "implement-stack-using-queues", name: "Implement Stack Using Queues", difficulty: "Easy", number: 225, url: "https://leetcode.com/problems/implement-stack-using-queues/" },
      { slug: "implement-queue-using-stacks", name: "Implement Queue using Stacks", difficulty: "Easy", number: 232, url: "https://leetcode.com/problems/implement-queue-using-stacks" },
      { slug: "asteroid-collision", name: "Asteroid Collision", difficulty: "Medium", number: 735, url: "https://leetcode.com/problems/asteroid-collision/" },
      { slug: "online-stock-span", name: "Online Stock Span", difficulty: "Medium", number: 901, url: "https://leetcode.com/problems/online-stock-span/" },
      { slug: "simplify-path", name: "Simplify Path", difficulty: "Medium", number: 71, url: "https://leetcode.com/problems/simplify-path/" },
      { slug: "decode-string", name: "Decode String", difficulty: "Medium", number: 394, url: "https://leetcode.com/problems/decode-string/" },
      { slug: "maximum-frequency-stack", name: "Maximum Frequency Stack", difficulty: "Hard", number: 895, url: "https://leetcode.com/problems/maximum-frequency-stack/" },
    ],
  },
  {
    name: "Binary Search",
    problems: [
      { slug: "search-insert-position", name: "Search Insert Position", difficulty: "Easy", number: 35, url: "https://leetcode.com/problems/search-insert-position/" },
      { slug: "guess-number-higher-or-lower", name: "Guess Number Higher Or Lower", difficulty: "Easy", number: 374, url: "https://leetcode.com/problems/guess-number-higher-or-lower/" },
      { slug: "sqrtx", name: "Sqrt(x)", difficulty: "Easy", number: 69, url: "https://leetcode.com/problems/sqrtx/" },
      { slug: "capacity-to-ship-packages-within-d-days", name: "Capacity to Ship Packages Within D Days", difficulty: "Medium", number: 1011, url: "https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/" },
      { slug: "search-in-rotated-sorted-array-ii", name: "Search In Rotated Sorted Array II", difficulty: "Medium", number: 81, url: "https://leetcode.com/problems/search-in-rotated-sorted-array-ii/" },
      { slug: "split-array-largest-sum", name: "Split Array Largest Sum", difficulty: "Hard", number: 410, url: "https://leetcode.com/problems/split-array-largest-sum/" },
      { slug: "find-in-mountain-array", name: "Find in Mountain Array", difficulty: "Hard", number: 1095, url: "https://leetcode.com/problems/find-in-mountain-array" },
    ],
  },
  {
    name: "Linked List",
    problems: [
      { slug: "reverse-linked-list-ii", name: "Reverse Linked List II", difficulty: "Medium", number: 92, url: "https://leetcode.com/problems/reverse-linked-list-ii/" },
      { slug: "design-circular-queue", name: "Design Circular Queue", difficulty: "Medium", number: 622, url: "https://leetcode.com/problems/design-circular-queue/" },
      { slug: "lfu-cache", name: "LFU Cache", difficulty: "Hard", number: 460, url: "https://leetcode.com/problems/lfu-cache/" },
    ],
  },
  {
    name: "Trees",
    problems: [
      { slug: "binary-tree-inorder-traversal", name: "Binary Tree Inorder Traversal", difficulty: "Easy", number: 94, url: "https://leetcode.com/problems/binary-tree-inorder-traversal/" },
      { slug: "binary-tree-preorder-traversal", name: "Binary Tree Preorder Traversal", difficulty: "Easy", number: 144, url: "https://leetcode.com/problems/binary-tree-preorder-traversal/" },
      { slug: "binary-tree-postorder-traversal", name: "Binary Tree Postorder Traversal", difficulty: "Easy", number: 145, url: "https://leetcode.com/problems/binary-tree-postorder-traversal/" },
      { slug: "insert-into-a-binary-search-tree", name: "Insert into a Binary Search Tree", difficulty: "Medium", number: 701, url: "https://leetcode.com/problems/insert-into-a-binary-search-tree/" },
      { slug: "delete-node-in-a-bst", name: "Delete Node in a BST", difficulty: "Medium", number: 450, url: "https://leetcode.com/problems/delete-node-in-a-bst/" },
      { slug: "construct-quad-tree", name: "Construct Quad Tree", difficulty: "Medium", number: 427, url: "https://leetcode.com/problems/construct-quad-tree/" },
      { slug: "house-robber-iii", name: "House Robber III", difficulty: "Medium", number: 337, url: "https://leetcode.com/problems/house-robber-iii/" },
      { slug: "delete-leaves-with-a-given-value", name: "Delete Leaves With a Given Value", difficulty: "Medium", number: 1325, url: "https://leetcode.com/problems/delete-leaves-with-a-given-value" },
    ],
  },
  {
    name: "Heap / Priority Queue",
    problems: [
      { slug: "single-threaded-cpu", name: "Single Threaded CPU", difficulty: "Medium", number: 1834, url: "https://leetcode.com/problems/single-threaded-cpu/" },
      { slug: "reorganize-string", name: "Reorganize String", difficulty: "Medium", number: 767, url: "https://leetcode.com/problems/reorganize-string/" },
      { slug: "longest-happy-string", name: "Longest Happy String", difficulty: "Medium", number: 1405, url: "https://leetcode.com/problems/longest-happy-string/" },
      { slug: "car-pooling", name: "Car Pooling", difficulty: "Medium", number: 1094, url: "https://leetcode.com/problems/car-pooling/" },
      { slug: "ipo", name: "IPO", difficulty: "Hard", number: 502, url: "https://leetcode.com/problems/ipo/" },
    ],
  },
  {
    name: "Backtracking",
    problems: [
      { slug: "sum-of-all-subset-xor-totals", name: "Sum of All Subsets XOR Total", difficulty: "Easy", number: 1863, url: "https://leetcode.com/problems/sum-of-all-subset-xor-totals" },
      { slug: "combinations", name: "Combinations", difficulty: "Medium", number: 77, url: "https://leetcode.com/problems/combinations/" },
      { slug: "permutations-ii", name: "Permutations II", difficulty: "Medium", number: 47, url: "https://leetcode.com/problems/permutations-ii/" },
      { slug: "matchsticks-to-square", name: "Matchsticks to Square", difficulty: "Medium", number: 473, url: "https://leetcode.com/problems/matchsticks-to-square/" },
      { slug: "partition-to-k-equal-sum-subsets", name: "Partition to K Equal Sum Subsets", difficulty: "Medium", number: 698, url: "https://leetcode.com/problems/partition-to-k-equal-sum-subsets/" },
      { slug: "n-queens-ii", name: "N Queens II", difficulty: "Hard", number: 52, url: "https://leetcode.com/problems/n-queens-ii/" },
      { slug: "word-break-ii", name: "Word Break II", difficulty: "Hard", number: 140, url: "https://leetcode.com/problems/word-break-ii" },
    ],
  },
  {
    name: "Tries",
    problems: [
      { slug: "extra-characters-in-a-string", name: "Extra Characters in a String", difficulty: "Medium", number: 2707, url: "https://leetcode.com/problems/extra-characters-in-a-string/" },
    ],
  },
  {
    name: "Graphs",
    problems: [
      { slug: "island-perimeter", name: "Island Perimeter", difficulty: "Easy", number: 463, url: "https://leetcode.com/problems/island-perimeter/" },
      { slug: "verifying-an-alien-dictionary", name: "Verifying An Alien Dictionary", difficulty: "Easy", number: 953, url: "https://leetcode.com/problems/verifying-an-alien-dictionary/" },
      { slug: "find-the-town-judge", name: "Find the Town Judge", difficulty: "Easy", number: 997, url: "https://leetcode.com/problems/find-the-town-judge" },
      { slug: "open-the-lock", name: "Open The Lock", difficulty: "Medium", number: 752, url: "https://leetcode.com/problems/open-the-lock/" },
      { slug: "course-schedule-iv", name: "Course Schedule IV", difficulty: "Medium", number: 1462, url: "https://leetcode.com/problems/course-schedule-iv/" },
      { slug: "accounts-merge", name: "Accounts Merge", difficulty: "Medium", number: 721, url: "https://leetcode.com/problems/accounts-merge/" },
      { slug: "evaluate-division", name: "Evaluate Division", difficulty: "Medium", number: 399, url: "https://leetcode.com/problems/evaluate-division/" },
      { slug: "minimum-height-trees", name: "Minimum Height Trees", difficulty: "Medium", number: 310, url: "https://leetcode.com/problems/minimum-height-trees" },
    ],
  },
  {
    name: "Advanced Graphs",
    problems: [
      { slug: "path-with-minimum-effort", name: "Path with Minimum Effort", difficulty: "Medium", number: 1631, url: "https://leetcode.com/problems/path-with-minimum-effort/" },
      { slug: "find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree", name: "Find Critical and Pseudo Critical Edges in Minimum Spanning Tree", difficulty: "Hard", number: 1489, url: "https://leetcode.com/problems/find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree/" },
      { slug: "build-a-matrix-with-conditions", name: "Build a Matrix With Conditions", difficulty: "Hard", number: 2392, url: "https://leetcode.com/problems/build-a-matrix-with-conditions" },
      { slug: "greatest-common-divisor-traversal", name: "Greatest Common Divisor Traversal", difficulty: "Hard", number: 2709, url: "https://leetcode.com/problems/greatest-common-divisor-traversal" },
    ],
  },
  {
    name: "1-D Dynamic Programming",
    problems: [
      { slug: "n-th-tribonacci-number", name: "N-th Tribonacci Number", difficulty: "Easy", number: 1137, url: "https://leetcode.com/problems/n-th-tribonacci-number/" },
      { slug: "combination-sum-iv", name: "Combination Sum IV", difficulty: "Medium", number: 377, url: "https://leetcode.com/problems/combination-sum-iv/" },
      { slug: "perfect-squares", name: "Perfect Squares", difficulty: "Medium", number: 279, url: "https://leetcode.com/problems/perfect-squares/" },
      { slug: "integer-break", name: "Integer Break", difficulty: "Medium", number: 343, url: "https://leetcode.com/problems/integer-break/" },
      { slug: "stone-game-iii", name: "Stone Game III", difficulty: "Hard", number: 1406, url: "https://leetcode.com/problems/stone-game-iii/" },
    ],
  },
  {
    name: "2-D Dynamic Programming",
    problems: [
      { slug: "unique-paths-ii", name: "Unique Paths II", difficulty: "Medium", number: 63, url: "https://leetcode.com/problems/unique-paths-ii/" },
      { slug: "minimum-path-sum", name: "Minimum Path Sum", difficulty: "Medium", number: 64, url: "https://leetcode.com/problems/minimum-path-sum/" },
      { slug: "last-stone-weight-ii", name: "Last Stone Weight II", difficulty: "Medium", number: 1049, url: "https://leetcode.com/problems/last-stone-weight-ii/" },
      { slug: "stone-game", name: "Stone Game", difficulty: "Medium", number: 877, url: "https://leetcode.com/problems/stone-game/" },
      { slug: "stone-game-ii", name: "Stone Game II", difficulty: "Medium", number: 1140, url: "https://leetcode.com/problems/stone-game-ii/" },
    ],
  },
  {
    name: "Greedy",
    problems: [
      { slug: "lemonade-change", name: "Lemonade Change", difficulty: "Easy", number: 860, url: "https://leetcode.com/problems/lemonade-change/" },
      { slug: "maximum-sum-circular-subarray", name: "Maximum Sum Circular Subarray", difficulty: "Medium", number: 918, url: "https://leetcode.com/problems/maximum-sum-circular-subarray/" },
      { slug: "longest-turbulent-subarray", name: "Longest Turbulent Subarray", difficulty: "Medium", number: 978, url: "https://leetcode.com/problems/longest-turbulent-subarray/" },
      { slug: "jump-game-vii", name: "Jump Game VII", difficulty: "Medium", number: 1871, url: "https://leetcode.com/problems/jump-game-vii/" },
      { slug: "dota2-senate", name: "Dota2 Senate", difficulty: "Medium", number: 649, url: "https://leetcode.com/problems/dota2-senate/" },
      { slug: "candy", name: "Candy", difficulty: "Hard", number: 135, url: "https://leetcode.com/problems/candy/" },
    ],
  },
  {
    name: "Intervals",
    problems: [
      { slug: "meeting-rooms-iii", name: "Meeting Rooms III", difficulty: "Hard", number: 2402, url: "https://leetcode.com/problems/meeting-rooms-iii" },
    ],
  },
  {
    name: "Math & Geometry",
    problems: [
      { slug: "excel-sheet-column-title", name: "Excel Sheet Column Title", difficulty: "Easy", number: 168, url: "https://leetcode.com/problems/excel-sheet-column-title/" },
      { slug: "greatest-common-divisor-of-strings", name: "Greatest Common Divisor of Strings", difficulty: "Easy", number: 1071, url: "https://leetcode.com/problems/greatest-common-divisor-of-strings/" },
      { slug: "insert-greatest-common-divisors-in-linked-list", name: "Insert Greatest Common Divisors in Linked List", difficulty: "Medium", number: 2807, url: "https://leetcode.com/problems/insert-greatest-common-divisors-in-linked-list/" },
      { slug: "transpose-matrix", name: "Transpose Matrix", difficulty: "Easy", number: 867, url: "https://leetcode.com/problems/transpose-matrix" },
      { slug: "roman-to-integer", name: "Roman to Integer", difficulty: "Easy", number: 13, url: "https://leetcode.com/problems/roman-to-integer/" },
    ],
  },
  {
    name: "Bit Manipulation",
    problems: [
      { slug: "add-binary", name: "Add Binary", difficulty: "Easy", number: 67, url: "https://leetcode.com/problems/add-binary/" },
      { slug: "bitwise-and-of-numbers-range", name: "Bitwise AND of Numbers Range", difficulty: "Medium", number: 201, url: "https://leetcode.com/problems/bitwise-and-of-numbers-range" },
      { slug: "minimum-array-end", name: "Minimum Array End", difficulty: "Medium", number: 3133, url: "https://leetcode.com/problems/minimum-array-end/" },
    ],
  },
];

/** Total problems in the list. Derived, so it cannot drift from the data. */
export const LEETCODE_TOTAL = LEETCODE_CATEGORIES.reduce((n, c) => n + c.problems.length, 0);

/** Every problem, flattened — for lookups by slug. */
export const LEETCODE_PROBLEMS: LeetProblem[] = LEETCODE_CATEGORIES.flatMap((c) => c.problems);

/**
 * Solved count at which technical prep reads as "on track" — 60% of the list.
 *
 * The previous thresholds were a bare `45` against a 75-problem list. Deriving
 * it keeps the same 60% bar now the list is 100, instead of quietly making the
 * milestone easier the moment the data changed.
 */
export const LEET_ON_TRACK = Math.round(LEETCODE_TOTAL * 0.6);

/** Category name for a problem slug, or null when the slug is unknown. */
export function categoryOf(slug: string): string | null {
  for (const c of LEETCODE_CATEGORIES) {
    if (c.problems.some((p) => p.slug === slug)) return c.name;
  }
  return null;
}
