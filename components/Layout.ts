import { SharedValue, useSharedValue } from "react-native-reanimated";

// These util functions were extracted from: wcadillon/react-native-redash

/**
 * @worklet
 */

/** 
Moves an element from "from" index to "to" index in an array, 
shifting everything else to fill the gap.
Example:

const arr = ['a', 'b', 'c', 'd']
move(arr, 0, 2)
// removes 'a' from index 0 → ['b', 'c', 'd']
// inserts 'a' at index 2   → ['b', 'c', 'a', 'd']
*/

export const move = <T>(input: T[], from: number, to: number) => {
  "worklet";
  const offsets = input.slice();
  while (from < 0) {
    from += offsets.length;
  }
  while (to < 0) {
    to += offsets.length;
  }
  if (to >= offsets.length) {
    let k = to - offsets.length;
    while (k-- + 1) {
      offsets.push();
    }
  }
  offsets.splice(to, 0, offsets.splice(from, 1)[0]);
  return offsets;
};

/**
 * @summary Returns true if node is within lowerBound and upperBound.
 * @worklet
 */
export const between = (value: number, lowerBound: number, upperBound: number, inclusive = true) => {
  "worklet";
  if (inclusive) {
    return value >= lowerBound && value <= upperBound;
  }
  return value > lowerBound && value < upperBound;
};

/**
 * @summary Type representing a vector
 * @example
   export interface Vector<T = number> {
    x: T;
    y: T;
  }
 */
export interface Vector<T = number> {
  x: T;
  y: T;
}

/**
 * @summary Returns a vector of shared values
 */
/*
export const useVector = (x1 = 0, y1?: number): Vector<Animated.SharedValue<number>> => {
  const x = useSharedValue(x1);
  const y = useSharedValue(y1 ?? x1);
  return { x, y };
};
*/
export const useVector = (x1 = 0, y1?: number): Vector<SharedValue<number>> => {
  const x = useSharedValue(x1);
  const y = useSharedValue(y1 ?? x1);
  return { x, y };
};

type SharedValues<T extends Record<string, string | number | boolean>> = {
  [K in keyof T]: SharedValue<T[K]>;
};

export type Offset = SharedValues<{
  order: number;
  height: number;
  width: number;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
}>;

const isNotInBank = (offset: Offset) => {
  "worklet";
  return offset.order.value !== -1;
};

const byOrder = (a: Offset, b: Offset) => {
  "worklet";
  return a.order.value - b.order.value;
};

export const lastOrder = (input: Offset[]) => {
  "worklet";
  return input.filter(isNotInBank).length;
};



export const remove = (input: Offset[], index: number) => {
  "worklet";
  const offsets = input
    .filter((_, i) => i !== index)
    .filter(isNotInBank)
    .sort(byOrder);

  for (let i = 0; i < offsets.length; i++) {
    offsets[i].order.value = i;
  }
};

export const reorder = (input: Offset[], from: number, to: number) => {
  /*
When a user drags word4 over word1, reorder() calls move() to shift the word array so the visual order updates:
  */
  "worklet";
  const offsets = input.filter(isNotInBank).sort(byOrder);
  const newOffset = move(offsets, from, to);
  for (let i = 0; i < newOffset.length; i++) {
    newOffset[i].order.value = i;
  }
};

/**
calculateLayout computes the x and y position for each word in the answer area
 (not the word bank). It lays words out in a wrapping row, like a flex-wrap layout.
 Visually:

 [ word1 ][ word2 ][ word3 ]   ← lineNumber=0
 [ word4 ][ word5 ]            ← lineNumber=1 (word4 didn't fit on line 0)

 It's essentially a manual flexWrap="wrap" implementation that runs on the Reanimated worklet thread, 
 so it can be called during gestures without touching the JS thread.
 */

export const calculateLayout = (
  input: Offset[],   // the full array of Offset objects, one per word (both in the answer area and in the bank)
  containerWidth: number,
  wordHeight: number,
  wordGap: number,
  lineGap: number,
) => {
  "worklet";
  // filter the input (offsets array) to get only the words that are in the answer area 
  // (not in the bank),
  // and sort them by their order value to get them in the correct visual order.
  /*
    input is the full array of Offset objects for all words, 
   */

  // containerWidth is the width of the area where the words are placed (the answer area). 
  // This is used to determine when to wrap to a new line.


  // note that the order value is set to -1 for words in the bank, so filtering by isNotInBank ensures we only get words that are currently placed in the answer area.
  //console.log("\n******** calculateLayout input", input.map((o) => ({ order: o.order.value, width: o.width.value })));
  console.log("\nLayout: calculateLayout: ENTRY input array is:")
  input.forEach((o, index) => {
    console.log(`index ${index}: order=${o.order.value}, width=${o.width.value}, x=${o.x.value}, y=${o.y.value}`);
  });
  console.log("\Layout: calculateLayout: filtering input to get only words in answer area and sorting by order, saving the results to a local offsets array.");
  const offsets = input.filter(isNotInBank).sort(byOrder);
  /*
 filter and sort create a new array but they do not copy or clone the objects inside — 
 they just create a new array holding references to the same shared value objects from input.
So offsets[0] on line 163 and input[2] (for example) could point to the exact same object 
in memory. When line 180 writes offset.x.value = 0, it's modifying the same shared value that
 ClickableWordNew is reading from in its useAnimatedStyle — which is what triggers the animation.
  */

  //console.log("calculateLayout: after filtering and sorting, (local) offsets array is: ", offsets.map((o) => ({ order: o.order.value, width: o.width.value })));
  console.log("\n Layout: calculateLayout: after filtering and sorting, (local) offsets array is:");
  offsets.forEach((o, index) => {
    console.log(`index ${index}: order=${o.order.value}, width=${o.width.value}`);
  });
  // now, offsets contains only the words that are currently in the answer area, sorted in the order they should be displayed.
  //console.log("******** calculateLayout offsets", offsets.map((o) => ({ order: o.order.value, width: o.width.value })));
  if (offsets.length === 0) {
    // if there are no words in the answer area, there's no layout to calculate,
    //  so just
    return;
  }
  let lineNumber = 0;
  let lineBreak = 0;
  // like mentioned about, all the following modifications to offsets 
  // trigger animation in ClickableWordNew because offsets contains 
  // references to the same shared value objects that ClickableWordNew 
  // is using to position words on the screen.

  // the following for loop iterates through the offsets (the words in the answer area) and 
  // calculates their x and y positions based on their widths and the container width, 
  // implementing a wrapping layout.
  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i];
    const total_width = offsets.slice(lineBreak, i).reduce((acc, o) => acc + o.width.value + wordGap / 2, 0);
    // total with is calculated by summing the widths of all the words in the current line (from lineBreak to i) 
    // and adding half of the wordGap for each word to account for the spacing between words.
    if (total_width + offset.width.value > containerWidth) {
      // if adding the current word's width to the total width of the current line exceeds the container width,
      //  we need to wrap to the next line.
      lineNumber += 1;
      lineBreak = i;
      offset.x.value = 0;
    } else {
      // adding the current word's width to the total width of the current line DOESN'T exceeds 
      // the container width, so we set its x position to the total width of the current line.
      offset.x.value = total_width;
    }
    // the y position is based on the line number, word height, and line gap. 
    // Each line adds wordHeight + lineGap to the y position, 
    // and we also add half of the lineGap at the end to center the words vertically within the line gap.
    offset.y.value = (wordHeight + lineGap) * lineNumber + lineGap / 2;
  }
  console.log("\nLayout: calculateLayout EXIT: after calculating layout, input array is:");
  input.forEach((o, index) => {
    console.log(`index ${index}: order=${o.order.value}, width=${o.width.value} ,x=${o.x.value}, y=${o.y.value}`);
  });
};

/*
what is lineBreak on line 192?

Read Layout.ts (lines 189-208)
lineBreak is the index of the first word on the current line. It starts at 0 (first word starts
at the beginning of the array).
When a word doesn't fit and wraps to a new line, lineBreak is updated to i — marking that 
word as the new start of the next line.

It's used in offsets.slice(lineBreak, i) on line 204 to measure only the words on the current line 
when calculating total_width. Without it, slice would accumulate widths from all previous lines too, 
giving a wrong total.

Example with words [A, B, C, D] where C wraps:

i=0: lineBreak=0, slice(0,0) → [] → total=0  (A goes to x=0)
i=1: lineBreak=0, slice(0,1) → [A] → total=A.width  (B placed after A)
i=2: lineBreak=0, slice(0,2) → [A,B] → total too wide → lineBreak=2, lineNumber=1 (C wraps)
i=3: lineBreak=2, slice(2,3) → [C] → total=C.width  (D placed after C on line 2)

*/

/*
Read Layout.ts (lines 198-202)
Line 199 is total, not total_width. Let me re-read the correct line:

Read Layout.ts (lines 202-209)
total_width on line 204 is calculated using .reduce() on a slice of the offsets array:

offsets.slice(lineBreak, i) — takes only the words already placed on the current line, 
from the first word of the line (lineBreak) up to but not including the current word (i).

.reduce((acc, o) => acc + o.width.value + wordGap / 2, 0) — sums up the width of each of those words, 
adding wordGap / 2 per word as spacing. Starts at 0.

For example, if the current line has 2 words with widths 50 and 70, and wordGap = 10:


total_width = (50 + 5) + (70 + 5) = 130
This tells you how much horizontal space is already consumed on the current line, 
so you can decide whether the next word fits or needs to wrap.



*/

