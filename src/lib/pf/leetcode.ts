/**
 * The Blind 75 — the canonical interview-prep list, 18 categories, 75 problems.
 *
 * Every entry is a real problem with a real LeetCode number and link, taken from
 * the published Blind 75 (as grouped on neetcode.io/practice/blind75). This
 * replaced a 100-problem NeetCode-250 subset so the page shows the list students
 * are actually pointed at, and can link straight out to NeetCode 150 for more.
 *
 * Category sizes are deliberately uneven (Trees has 11, Stack / Advanced Graphs /
 * Heap have 1 each) because that is how the list is actually weighted. Do not pad
 * the short ones to make the layout tidier.
 *
 * Problem `slug` is the stable key: it is what the store records as solved, so
 * renaming a category never loses a student's progress. A few problems are
 * LeetCode Premium (Encode/Decode Strings, Graph Valid Tree, etc.) — the URLs
 * are still valid, they just need a Premium account to open.
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

const lc = (slug: string): string => `https://leetcode.com/problems/${slug}/`;

export const LEETCODE_CATEGORIES: LeetCategory[] = [
  {
    name: "Arrays & Hashing",
    problems: [
      { slug: "contains-duplicate", name: "Contains Duplicate", difficulty: "Easy", number: 217, url: lc("contains-duplicate") },
      { slug: "valid-anagram", name: "Valid Anagram", difficulty: "Easy", number: 242, url: lc("valid-anagram") },
      { slug: "two-sum", name: "Two Sum", difficulty: "Easy", number: 1, url: lc("two-sum") },
      { slug: "group-anagrams", name: "Group Anagrams", difficulty: "Medium", number: 49, url: lc("group-anagrams") },
      { slug: "top-k-frequent-elements", name: "Top K Frequent Elements", difficulty: "Medium", number: 347, url: lc("top-k-frequent-elements") },
      { slug: "product-of-array-except-self", name: "Product of Array Except Self", difficulty: "Medium", number: 238, url: lc("product-of-array-except-self") },
      { slug: "encode-and-decode-strings", name: "Encode and Decode Strings", difficulty: "Medium", number: 271, url: lc("encode-and-decode-strings") },
      { slug: "longest-consecutive-sequence", name: "Longest Consecutive Sequence", difficulty: "Medium", number: 128, url: lc("longest-consecutive-sequence") },
    ],
  },
  {
    name: "Two Pointers",
    problems: [
      { slug: "valid-palindrome", name: "Valid Palindrome", difficulty: "Easy", number: 125, url: lc("valid-palindrome") },
      { slug: "3sum", name: "3Sum", difficulty: "Medium", number: 15, url: lc("3sum") },
      { slug: "container-with-most-water", name: "Container With Most Water", difficulty: "Medium", number: 11, url: lc("container-with-most-water") },
    ],
  },
  {
    name: "Sliding Window",
    problems: [
      { slug: "best-time-to-buy-and-sell-stock", name: "Best Time to Buy and Sell Stock", difficulty: "Easy", number: 121, url: lc("best-time-to-buy-and-sell-stock") },
      { slug: "longest-substring-without-repeating-characters", name: "Longest Substring Without Repeating Characters", difficulty: "Medium", number: 3, url: lc("longest-substring-without-repeating-characters") },
      { slug: "longest-repeating-character-replacement", name: "Longest Repeating Character Replacement", difficulty: "Medium", number: 424, url: lc("longest-repeating-character-replacement") },
      { slug: "minimum-window-substring", name: "Minimum Window Substring", difficulty: "Hard", number: 76, url: lc("minimum-window-substring") },
    ],
  },
  {
    name: "Stack",
    problems: [
      { slug: "valid-parentheses", name: "Valid Parentheses", difficulty: "Easy", number: 20, url: lc("valid-parentheses") },
    ],
  },
  {
    name: "Binary Search",
    problems: [
      { slug: "find-minimum-in-rotated-sorted-array", name: "Find Minimum in Rotated Sorted Array", difficulty: "Medium", number: 153, url: lc("find-minimum-in-rotated-sorted-array") },
      { slug: "search-in-rotated-sorted-array", name: "Search in Rotated Sorted Array", difficulty: "Medium", number: 33, url: lc("search-in-rotated-sorted-array") },
    ],
  },
  {
    name: "Linked List",
    problems: [
      { slug: "reverse-linked-list", name: "Reverse Linked List", difficulty: "Easy", number: 206, url: lc("reverse-linked-list") },
      { slug: "merge-two-sorted-lists", name: "Merge Two Sorted Lists", difficulty: "Easy", number: 21, url: lc("merge-two-sorted-lists") },
      { slug: "reorder-list", name: "Reorder List", difficulty: "Medium", number: 143, url: lc("reorder-list") },
      { slug: "remove-nth-node-from-end-of-list", name: "Remove Nth Node From End of List", difficulty: "Medium", number: 19, url: lc("remove-nth-node-from-end-of-list") },
      { slug: "linked-list-cycle", name: "Linked List Cycle", difficulty: "Easy", number: 141, url: lc("linked-list-cycle") },
      { slug: "merge-k-sorted-lists", name: "Merge K Sorted Lists", difficulty: "Hard", number: 23, url: lc("merge-k-sorted-lists") },
    ],
  },
  {
    name: "Trees",
    problems: [
      { slug: "invert-binary-tree", name: "Invert Binary Tree", difficulty: "Easy", number: 226, url: lc("invert-binary-tree") },
      { slug: "maximum-depth-of-binary-tree", name: "Maximum Depth of Binary Tree", difficulty: "Easy", number: 104, url: lc("maximum-depth-of-binary-tree") },
      { slug: "same-tree", name: "Same Tree", difficulty: "Easy", number: 100, url: lc("same-tree") },
      { slug: "subtree-of-another-tree", name: "Subtree of Another Tree", difficulty: "Easy", number: 572, url: lc("subtree-of-another-tree") },
      { slug: "lowest-common-ancestor-of-a-binary-search-tree", name: "Lowest Common Ancestor of a BST", difficulty: "Medium", number: 235, url: lc("lowest-common-ancestor-of-a-binary-search-tree") },
      { slug: "binary-tree-level-order-traversal", name: "Binary Tree Level Order Traversal", difficulty: "Medium", number: 102, url: lc("binary-tree-level-order-traversal") },
      { slug: "validate-binary-search-tree", name: "Validate Binary Search Tree", difficulty: "Medium", number: 98, url: lc("validate-binary-search-tree") },
      { slug: "kth-smallest-element-in-a-bst", name: "Kth Smallest Element in a BST", difficulty: "Medium", number: 230, url: lc("kth-smallest-element-in-a-bst") },
      { slug: "construct-binary-tree-from-preorder-and-inorder-traversal", name: "Construct Binary Tree from Preorder and Inorder Traversal", difficulty: "Medium", number: 105, url: lc("construct-binary-tree-from-preorder-and-inorder-traversal") },
      { slug: "binary-tree-maximum-path-sum", name: "Binary Tree Maximum Path Sum", difficulty: "Hard", number: 124, url: lc("binary-tree-maximum-path-sum") },
      { slug: "serialize-and-deserialize-binary-tree", name: "Serialize and Deserialize Binary Tree", difficulty: "Hard", number: 297, url: lc("serialize-and-deserialize-binary-tree") },
    ],
  },
  {
    name: "Tries",
    problems: [
      { slug: "implement-trie-prefix-tree", name: "Implement Trie (Prefix Tree)", difficulty: "Medium", number: 208, url: lc("implement-trie-prefix-tree") },
      { slug: "design-add-and-search-words-data-structure", name: "Design Add and Search Words Data Structure", difficulty: "Medium", number: 211, url: lc("design-add-and-search-words-data-structure") },
      { slug: "word-search-ii", name: "Word Search II", difficulty: "Hard", number: 212, url: lc("word-search-ii") },
    ],
  },
  {
    name: "Heap / Priority Queue",
    problems: [
      { slug: "find-median-from-data-stream", name: "Find Median from Data Stream", difficulty: "Hard", number: 295, url: lc("find-median-from-data-stream") },
    ],
  },
  {
    name: "Backtracking",
    problems: [
      { slug: "combination-sum", name: "Combination Sum", difficulty: "Medium", number: 39, url: lc("combination-sum") },
      { slug: "word-search", name: "Word Search", difficulty: "Medium", number: 79, url: lc("word-search") },
    ],
  },
  {
    name: "Graphs",
    problems: [
      { slug: "number-of-islands", name: "Number of Islands", difficulty: "Medium", number: 200, url: lc("number-of-islands") },
      { slug: "clone-graph", name: "Clone Graph", difficulty: "Medium", number: 133, url: lc("clone-graph") },
      { slug: "pacific-atlantic-water-flow", name: "Pacific Atlantic Water Flow", difficulty: "Medium", number: 417, url: lc("pacific-atlantic-water-flow") },
      { slug: "course-schedule", name: "Course Schedule", difficulty: "Medium", number: 207, url: lc("course-schedule") },
      { slug: "number-of-connected-components-in-an-undirected-graph", name: "Number of Connected Components in an Undirected Graph", difficulty: "Medium", number: 323, url: lc("number-of-connected-components-in-an-undirected-graph") },
      { slug: "graph-valid-tree", name: "Graph Valid Tree", difficulty: "Medium", number: 261, url: lc("graph-valid-tree") },
    ],
  },
  {
    name: "Advanced Graphs",
    problems: [
      { slug: "alien-dictionary", name: "Alien Dictionary", difficulty: "Hard", number: 269, url: lc("alien-dictionary") },
    ],
  },
  {
    name: "1-D Dynamic Programming",
    problems: [
      { slug: "climbing-stairs", name: "Climbing Stairs", difficulty: "Easy", number: 70, url: lc("climbing-stairs") },
      { slug: "house-robber", name: "House Robber", difficulty: "Medium", number: 198, url: lc("house-robber") },
      { slug: "house-robber-ii", name: "House Robber II", difficulty: "Medium", number: 213, url: lc("house-robber-ii") },
      { slug: "longest-palindromic-substring", name: "Longest Palindromic Substring", difficulty: "Medium", number: 5, url: lc("longest-palindromic-substring") },
      { slug: "palindromic-substrings", name: "Palindromic Substrings", difficulty: "Medium", number: 647, url: lc("palindromic-substrings") },
      { slug: "decode-ways", name: "Decode Ways", difficulty: "Medium", number: 91, url: lc("decode-ways") },
      { slug: "coin-change", name: "Coin Change", difficulty: "Medium", number: 322, url: lc("coin-change") },
      { slug: "maximum-product-subarray", name: "Maximum Product Subarray", difficulty: "Medium", number: 152, url: lc("maximum-product-subarray") },
      { slug: "word-break", name: "Word Break", difficulty: "Medium", number: 139, url: lc("word-break") },
      { slug: "longest-increasing-subsequence", name: "Longest Increasing Subsequence", difficulty: "Medium", number: 300, url: lc("longest-increasing-subsequence") },
    ],
  },
  {
    name: "2-D Dynamic Programming",
    problems: [
      { slug: "unique-paths", name: "Unique Paths", difficulty: "Medium", number: 62, url: lc("unique-paths") },
      { slug: "longest-common-subsequence", name: "Longest Common Subsequence", difficulty: "Medium", number: 1143, url: lc("longest-common-subsequence") },
    ],
  },
  {
    name: "Greedy",
    problems: [
      { slug: "maximum-subarray", name: "Maximum Subarray", difficulty: "Medium", number: 53, url: lc("maximum-subarray") },
      { slug: "jump-game", name: "Jump Game", difficulty: "Medium", number: 55, url: lc("jump-game") },
    ],
  },
  {
    name: "Intervals",
    problems: [
      { slug: "insert-interval", name: "Insert Interval", difficulty: "Medium", number: 57, url: lc("insert-interval") },
      { slug: "merge-intervals", name: "Merge Intervals", difficulty: "Medium", number: 56, url: lc("merge-intervals") },
      { slug: "non-overlapping-intervals", name: "Non-overlapping Intervals", difficulty: "Medium", number: 435, url: lc("non-overlapping-intervals") },
      { slug: "meeting-rooms", name: "Meeting Rooms", difficulty: "Easy", number: 252, url: lc("meeting-rooms") },
      { slug: "meeting-rooms-ii", name: "Meeting Rooms II", difficulty: "Medium", number: 253, url: lc("meeting-rooms-ii") },
    ],
  },
  {
    name: "Math & Geometry",
    problems: [
      { slug: "rotate-image", name: "Rotate Image", difficulty: "Medium", number: 48, url: lc("rotate-image") },
      { slug: "spiral-matrix", name: "Spiral Matrix", difficulty: "Medium", number: 54, url: lc("spiral-matrix") },
      { slug: "set-matrix-zeroes", name: "Set Matrix Zeroes", difficulty: "Medium", number: 73, url: lc("set-matrix-zeroes") },
    ],
  },
  {
    name: "Bit Manipulation",
    problems: [
      { slug: "number-of-1-bits", name: "Number of 1 Bits", difficulty: "Easy", number: 191, url: lc("number-of-1-bits") },
      { slug: "counting-bits", name: "Counting Bits", difficulty: "Easy", number: 338, url: lc("counting-bits") },
      { slug: "reverse-bits", name: "Reverse Bits", difficulty: "Easy", number: 190, url: lc("reverse-bits") },
      { slug: "missing-number", name: "Missing Number", difficulty: "Easy", number: 268, url: lc("missing-number") },
      { slug: "sum-of-two-integers", name: "Sum of Two Integers", difficulty: "Medium", number: 371, url: lc("sum-of-two-integers") },
    ],
  },
];

/** Total problems in the list. Derived, so it cannot drift from the data. */
export const LEETCODE_TOTAL = LEETCODE_CATEGORIES.reduce((n, c) => n + c.problems.length, 0);

/** Every problem, flattened — for lookups by slug. */
export const LEETCODE_PROBLEMS: LeetProblem[] = LEETCODE_CATEGORIES.flatMap((c) => c.problems);

/** Where the fuller list lives, for students who finish the Blind 75. */
export const NEETCODE_URL = "https://neetcode.io/practice";

/**
 * Solved count at which technical prep reads as "on track" — 60% of the list.
 *
 * Deriving it keeps the 60% bar whatever the list length is, instead of quietly
 * changing the milestone the moment the data does. For the Blind 75 that is 45.
 */
export const LEET_ON_TRACK = Math.round(LEETCODE_TOTAL * 0.6);

/** Category name for a problem slug, or null when the slug is unknown. */
export function categoryOf(slug: string): string | null {
  for (const c of LEETCODE_CATEGORIES) {
    if (c.problems.some((p) => p.slug === slug)) return c.name;
  }
  return null;
}
