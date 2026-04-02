// NeetCode 75 & 150 - organised by category
// Sources: neetcode.io/practice
export type LeetCodeProblem = {
  id: string;
  title: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  leetcodeSlug: string;
  neetcodeUrl: string;
  list: "75" | "150"; // 75 = Blind 75 only, 150 = NeetCode 150 extra
};

const BASE_LEETCODE = "https://leetcode.com/problems";
const NEETCODE_BASE = "https://neetcode.io/practice";

function slug(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
function p(
  id: string,
  title: string,
  category: string,
  difficulty: "Easy" | "Medium" | "Hard",
  list: "75" | "150" = "75"
): LeetCodeProblem {
  const lcSlug = slug(title);
  return {
    id,
    title,
    category,
    difficulty,
    leetcodeSlug: lcSlug,
    neetcodeUrl: `${NEETCODE_BASE}/neetcode-150/${lcSlug}`,
    list,
  };
}

// Blind 75 + NeetCode 150 problems by category
export const NEETCODE_BY_CATEGORY: Record<string, LeetCodeProblem[]> = {
  "Arrays & Hashing": [
    p("75-1", "Two Sum", "Arrays & Hashing", "Easy"),
    p("75-2", "Valid Anagram", "Arrays & Hashing", "Easy"),
    p("75-3", "Contains Duplicate", "Arrays & Hashing", "Easy"),
    p("75-4", "Group Anagrams", "Arrays & Hashing", "Medium"),
    p("75-5", "Top K Frequent Elements", "Arrays & Hashing", "Medium"),
    p("75-6", "Product of Array Except Self", "Arrays & Hashing", "Medium"),
    p("75-7", "Valid Sudoku", "Arrays & Hashing", "Medium"),
    p("75-8", "Longest Consecutive Sequence", "Arrays & Hashing", "Medium"),
    p("150-1", "Encode and Decode Strings", "Arrays & Hashing", "Medium", "150"),
  ],
  "Two Pointers": [
    p("75-9", "Valid Palindrome", "Two Pointers", "Easy"),
    p("75-10", "Two Sum II", "Two Pointers", "Medium"),
    p("75-11", "3Sum", "Two Pointers", "Medium"),
    p("75-12", "Container With Most Water", "Two Pointers", "Medium"),
    p("75-13", "Trapping Rain Water", "Two Pointers", "Hard"),
  ],
  "Sliding Window": [
    p("75-14", "Best Time to Buy and Sell Stock", "Sliding Window", "Easy"),
    p("75-15", "Longest Substring Without Repeating Characters", "Sliding Window", "Medium"),
    p("150-2", "Longest Repeating Character Replacement", "Sliding Window", "Medium", "150"),
    p("150-3", "Permutation in String", "Sliding Window", "Medium", "150"),
    p("150-4", "Minimum Window Substring", "Sliding Window", "Hard", "150"),
    p("150-5", "Sliding Window Maximum", "Sliding Window", "Hard", "150"),
  ],
  Stack: [
    p("75-16", "Valid Parentheses", "Stack", "Easy"),
    p("75-17", "Min Stack", "Stack", "Medium"),
    p("75-18", "Evaluate Reverse Polish Notation", "Stack", "Medium"),
    p("75-19", "Generate Parentheses", "Stack", "Medium"),
    p("75-20", "Daily Temperatures", "Stack", "Medium"),
    p("150-6", "Largest Rectangle in Histogram", "Stack", "Hard", "150"),
  ],
  "Binary Search": [
    p("75-21", "Binary Search", "Binary Search", "Easy"),
    p("75-22", "Search a 2D Matrix", "Binary Search", "Medium"),
    p("75-23", "Koko Eating Bananas", "Binary Search", "Medium"),
    p("150-7", "Find Minimum in Rotated Sorted Array", "Binary Search", "Medium", "150"),
    p("150-8", "Search in Rotated Sorted Array", "Binary Search", "Medium", "150"),
    p("150-9", "Time Based Key-Value Store", "Binary Search", "Medium", "150"),
    p("150-10", "Median of Two Sorted Arrays", "Binary Search", "Hard", "150"),
  ],
  "Linked List": [
    p("75-24", "Reverse Linked List", "Linked List", "Easy"),
    p("75-25", "Merge Two Sorted Lists", "Linked List", "Easy"),
    p("75-26", "Reorder List", "Linked List", "Medium"),
    p("75-27", "Remove Nth Node From End", "Linked List", "Medium"),
    p("75-28", "Copy List with Random Pointer", "Linked List", "Medium"),
    p("75-29", "Add Two Numbers", "Linked List", "Medium"),
    p("75-30", "Linked List Cycle", "Linked List", "Easy"),
    p("150-11", "Find the Duplicate Number", "Linked List", "Medium", "150"),
    p("150-12", "LRU Cache", "Linked List", "Medium", "150"),
    p("150-13", "Merge K Sorted Lists", "Linked List", "Hard", "150"),
    p("150-14", "Reverse Nodes in K-Group", "Linked List", "Hard", "150"),
  ],
  Trees: [
    p("75-31", "Invert Binary Tree", "Trees", "Easy"),
    p("75-32", "Maximum Depth of Binary Tree", "Trees", "Easy"),
    p("75-33", "Same Tree", "Trees", "Easy"),
    p("75-34", "Subtree of Another Tree", "Trees", "Easy"),
    p("75-35", "Lowest Common Ancestor of BST", "Trees", "Medium"),
    p("75-36", "Binary Tree Level Order Traversal", "Trees", "Medium"),
    p("75-37", "Validate Binary Search Tree", "Trees", "Medium"),
    p("75-38", "Kth Smallest in BST", "Trees", "Medium"),
    p("75-39", "Construct Binary Tree from Preorder and Inorder", "Trees", "Medium"),
    p("75-40", "Binary Tree Max Path Sum", "Trees", "Hard"),
    p("150-15", "Serialize and Deserialize Binary Tree", "Trees", "Hard", "150"),
    p("150-16", "Implement Trie", "Trees", "Medium", "150"),
    p("150-17", "Design Add and Search Words Data Structure", "Trees", "Medium", "150"),
    p("150-18", "Word Search II", "Trees", "Hard", "150"),
    p("150-19", "Kth Largest Element in Stream", "Trees", "Easy", "150"),
  ],
  "Heap / Priority Queue": [
    p("75-41", "Find Median from Data Stream", "Heap / Priority Queue", "Hard"),
    p("150-20", "Merge K Sorted Lists", "Heap / Priority Queue", "Hard", "150"),
    p("150-21", "Top K Frequent Elements", "Heap / Priority Queue", "Medium", "150"),
    p("150-22", "Task Scheduler", "Heap / Priority Queue", "Medium", "150"),
    p("150-23", "K Closest Points to Origin", "Heap / Priority Queue", "Medium", "150"),
    p("150-24", "Kth Largest Element in Array", "Heap / Priority Queue", "Medium", "150"),
    p("150-25", "Last Stone Weight", "Heap / Priority Queue", "Easy", "150"),
  ],
  Backtracking: [
    p("75-42", "Combination Sum", "Backtracking", "Medium"),
    p("75-43", "Word Search", "Backtracking", "Medium"),
    p("75-44", "Palindrome Partitioning", "Backtracking", "Medium"),
    p("75-45", "Letter Combinations of Phone Number", "Backtracking", "Medium"),
    p("150-26", "Subsets", "Backtracking", "Medium", "150"),
    p("150-27", "Subsets II", "Backtracking", "Medium", "150"),
    p("150-28", "Permutations", "Backtracking", "Medium", "150"),
    p("150-29", "Permutations II", "Backtracking", "Medium", "150"),
    p("150-30", "N-Queens", "Backtracking", "Hard", "150"),
    p("150-31", "Sudoku Solver", "Backtracking", "Hard", "150"),
  ],
  Tries: [
    p("150-32", "Implement Trie (Prefix Tree)", "Tries", "Medium", "150"),
    p("150-33", "Design Add and Search Words Data Structure", "Tries", "Medium", "150"),
    p("150-34", "Word Search II", "Tries", "Hard", "150"),
  ],
  Graphs: [
    p("75-46", "Number of Islands", "Graphs", "Medium"),
    p("75-47", "Clone Graph", "Graphs", "Medium"),
    p("75-48", "Pacific Atlantic Water Flow", "Graphs", "Medium"),
    p("75-49", "Course Schedule", "Graphs", "Medium"),
    p("75-50", "Graph Valid Tree", "Graphs", "Medium"),
    p("150-35", "Number of Connected Components", "Graphs", "Medium", "150"),
    p("150-36", "Redundant Connection", "Graphs", "Medium", "150"),
    p("150-37", "Graph Valid Tree", "Graphs", "Medium", "150"),
    p("150-38", "Word Ladder", "Graphs", "Hard", "150"),
    p("150-39", "Minimum Cost to Connect All Points", "Graphs", "Medium", "150"),
    p("150-40", "Network Delay Time", "Graphs", "Medium", "150"),
    p("150-41", "Cheapest Flights Within K Stops", "Graphs", "Medium", "150"),
    p("150-42", "Reconstruct Itinerary", "Graphs", "Hard", "150"),
  ],
  "Advanced Graphs": [
    p("150-43", "Swim in Rising Water", "Advanced Graphs", "Hard", "150"),
    p("150-44", "Min Cost to Connect All Points", "Advanced Graphs", "Medium", "150"),
    p("150-45", "Network Delay Time", "Advanced Graphs", "Medium", "150"),
    p("150-46", "Alien Dictionary", "Advanced Graphs", "Hard", "150"),
    p("150-47", "Word Ladder", "Advanced Graphs", "Hard", "150"),
    p("150-48", "Bus Routes", "Advanced Graphs", "Hard", "150"),
  ],
  "1-D Dynamic Programming": [
    p("75-51", "Climbing Stairs", "1-D Dynamic Programming", "Easy"),
    p("75-52", "House Robber", "1-D Dynamic Programming", "Medium"),
    p("75-53", "House Robber II", "1-D Dynamic Programming", "Medium"),
    p("75-54", "Longest Palindromic Substring", "1-D Dynamic Programming", "Medium"),
    p("75-55", "Palindromic Substrings", "1-D Dynamic Programming", "Medium"),
    p("75-56", "Decode Ways", "1-D Dynamic Programming", "Medium"),
    p("75-57", "Coin Change", "1-D Dynamic Programming", "Medium"),
    p("75-58", "Maximum Product Subarray", "1-D Dynamic Programming", "Medium"),
    p("150-49", "Maximum Subarray", "1-D Dynamic Programming", "Medium", "150"),
    p("150-50", "Word Break", "1-D Dynamic Programming", "Medium", "150"),
    p("150-51", "Combination Sum IV", "1-D Dynamic Programming", "Medium", "150"),
    p("150-52", "House Robber II", "1-D Dynamic Programming", "Medium", "150"),
  ],
  "2-D Dynamic Programming": [
    p("75-59", "Unique Paths", "2-D Dynamic Programming", "Medium"),
    p("75-60", "Longest Common Subsequence", "2-D Dynamic Programming", "Medium"),
    p("75-61", "Word Break", "2-D Dynamic Programming", "Medium"),
    p("75-62", "Combination Sum", "2-D Dynamic Programming", "Medium"),
    p("150-53", "Maximum Product Subarray", "2-D Dynamic Programming", "Medium", "150"),
    p("150-54", "Unique Paths II", "2-D Dynamic Programming", "Medium", "150"),
    p("150-55", "Minimum Path Sum", "2-D Dynamic Programming", "Medium", "150"),
    p("150-56", "Longest Increasing Path", "2-D Dynamic Programming", "Hard", "150"),
    p("150-57", "Edit Distance", "2-D Dynamic Programming", "Medium", "150"),
    p("150-58", "Interleaving String", "2-D Dynamic Programming", "Medium", "150"),
    p("150-59", "Distinct Subsequences", "2-D Dynamic Programming", "Hard", "150"),
  ],
  Greedy: [
    p("75-63", "Maximum Subarray", "Greedy", "Medium"),
    p("75-64", "Jump Game", "Greedy", "Medium"),
    p("75-65", "Jump Game II", "Greedy", "Medium"),
    p("75-66", "Merge Intervals", "Greedy", "Medium"),
    p("75-67", "Insert Interval", "Greedy", "Medium"),
    p("75-68", "Non-overlapping Intervals", "Greedy", "Medium"),
    p("150-60", "Partition Labels", "Greedy", "Medium", "150"),
    p("150-61", "Valid Parenthesis String", "Greedy", "Medium", "150"),
  ],
  Intervals: [
    p("75-69", "Insert Interval", "Intervals", "Medium"),
    p("75-70", "Merge Intervals", "Intervals", "Medium"),
    p("75-71", "Non-overlapping Intervals", "Intervals", "Medium"),
    p("150-62", "Minimum Interval to Include Each Query", "Intervals", "Hard", "150"),
    p("150-63", "Summary Ranges", "Intervals", "Easy", "150"),
    p("150-64", "Merge Intervals", "Intervals", "Medium", "150"),
  ],
  "Math & Geometry": [
    p("75-72", "Rotate Image", "Math & Geometry", "Medium"),
    p("75-73", "Spiral Matrix", "Math & Geometry", "Medium"),
    p("150-65", "Set Matrix Zeroes", "Math & Geometry", "Medium", "150"),
    p("150-66", "Happy Number", "Math & Geometry", "Easy", "150"),
    p("150-67", "Plus One", "Math & Geometry", "Easy", "150"),
    p("150-68", "Pow(x, n)", "Math & Geometry", "Medium", "150"),
    p("150-69", "Multiply Strings", "Math & Geometry", "Medium", "150"),
    p("150-70", "Detect Squares", "Math & Geometry", "Medium", "150"),
  ],
  "Bit Manipulation": [
    p("75-74", "Number of 1 Bits", "Bit Manipulation", "Easy"),
    p("75-75", "Counting Bits", "Bit Manipulation", "Easy"),
    p("150-71", "Reverse Bits", "Bit Manipulation", "Easy", "150"),
    p("150-72", "Missing Number", "Bit Manipulation", "Easy", "150"),
    p("150-73", "Sum of Two Integers", "Bit Manipulation", "Medium", "150"),
    p("150-74", "Single Number", "Bit Manipulation", "Easy", "150"),
    p("150-75", "Single Number II", "Bit Manipulation", "Medium", "150"),
  ],
};

export const NEETCODE_75_CATEGORIES = [
  "Arrays & Hashing",
  "Two Pointers",
  "Sliding Window",
  "Stack",
  "Binary Search",
  "Linked List",
  "Trees",
  "Heap / Priority Queue",
  "Backtracking",
  "Graphs",
  "1-D Dynamic Programming",
  "2-D Dynamic Programming",
  "Greedy",
  "Intervals",
  "Math & Geometry",
  "Bit Manipulation",
] as const;

export const NEETCODE_150_CATEGORIES = [
  ...NEETCODE_75_CATEGORIES,
  "Tries",
  "Advanced Graphs",
] as const;

export const ALL_PROBLEMS_75 = NEETCODE_75_CATEGORIES.flatMap(
  (cat) => (NEETCODE_BY_CATEGORY[cat] ?? []).filter((p) => p.list === "75")
);

export const ALL_PROBLEMS_150 = Object.values(NEETCODE_BY_CATEGORY).flat();

export function getLeetcodeUrl(slug: string) {
  return `${BASE_LEETCODE}/${slug}/`;
}
