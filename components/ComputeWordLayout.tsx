import React, { JSX, useRef, useState } from "react";
import { StyleSheet, View, type LayoutRectangle, type StyleProp, type ViewStyle } from "react-native";
import DebugGrid from "./DebugGrid";
import { Offset } from "./type";

export interface ComputeWordLayoutProps {
  children: JSX.Element[]; // array of WordContext.Provider components that wrap each Word component, 
                      // passed from parent (WordLayout) to measure each word's position/size
  onLayout(params: { numLines: number; wordStyles: StyleProp<ViewStyle>[] }): void;
  offsets: Offset[];  // output: to be populated with measured word positions/sizes and passed back to parent for Reanimated
  wordHeight: number;  // input: set to 30 in parent, used to set the height of each word's offset style for absolute positioning
  lineHeight: number;  // input from parent to calculate total height of answer lines,
  // it is just wordHeight multiplied by a multiplier (1.2) to add extra spacing between lines
  wordGap: number; // set to 10 in parent. To calculate horizontal gap between words in the word bank,
  wordBankOffsetY: number; // input from parent to add extra spacing between the answer lines and the word bank
  onContainerWidth(width: number): void;
 
}
/*
As DEFINED in parent:

const wordHeight = 30;
const wordGap = 10;

const lineHeight =  wordHeight * 1.2; // the 1.2 is just a multiplier to add some 
// extra space/ga between lines
const lineGap = lineHeight - wordHeight; // the gap between lines is the line height minus the word height
*/

/**
 * This component renders with 0 opacity in order to
 * compute word positioning & container width
 *
 * ComputeWordLayout
 *
 * The drag-and-drop system positions words using absolute positioning with Reanimated shared values.
 * To do that, it needs to know each word's width, x, and y upfront.
 * There's no way to know these before rendering, so this component renders the words first using
 * normal flexWrap layout (which React Native handles natively), then captures the measurements.
 *
 * ComputeWordLayout (invisible)
 *     ↓ measures all words via onLayout (width, x, and y)
 *     ↓ writes widths/positions into shared values
 *     ↓ calls onLayout() → setLayout() in parent (real UI, absolute positioned)
 */
export default function ComputeWordLayout({
  children,
  offsets,
  onLayout,
  wordHeight,
  lineHeight,
  wordGap,
  wordBankOffsetY,
  onContainerWidth,
}: ComputeWordLayoutProps) {
  const calculatedOffsets = useRef<LayoutRectangle[]>([]);
  const offsetStyles = useRef<StyleProp<ViewStyle>[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  return (
    <>
      <DebugGrid width={dimensions.width} height={dimensions.height} />
      <View
        style={[styles.computeWordLayoutContainer, styles["center"] ]}
        onLayout={(e) => {
          console.log("\n>>>>>>>> ComputeWordLayout: onLayout for (container): width=", e.nativeEvent.layout.width, "height=", e.nativeEvent.layout.height);
          setDimensions({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
          onContainerWidth(e.nativeEvent.layout.width);
       
        }}
      >
        {children.map((child, index) => {
          return (
            <View
              key={`compute.${index}`}
              onLayout={(e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                //console.log("\n ComputeWordLayout: onLayout for index ", index, ": x=", x, "y=", y, "width=", width, "height=", height);
                calculatedOffsets.current[index] = { width, height, x, y };
             
                //console.log("calculatedOffsets for index ", index, ": ", calculatedOffsets.current[index]);
                // Reminder: index points to the current word being measured, 
                // which corresponds to the same index in the "children" array 
                // (the array of WordContext.Provider components that wrap each Word component)
              
                if (Object.keys(calculatedOffsets.current).length === children.length) {
                  console.log("All words measured, calculating layout...");
                  /*
                    all the words have been displayed and therefore measured, so now we have the width, x, and y for each word 
                    saved in calculatedOffsets.current.
                  */
                 // print out the calculatedOffsets for all words for debugging
                  //  for (const index in calculatedOffsets.current) {
                  //    const { x, y, width, height } = calculatedOffsets.current[index];
                   //   console.log(`calculatedOffsets for word index ${index}: x=${x}, y=${y}, width=${width}, height=${height}`);
                   // }
                  // use calculatedOffsets to determine how many lines of words there are,
                  //  which is needed to calculate the total height of the answer lines 
                  // (linesHeight) so that we can position the word bank below the answer lines with some gap in between.
                  const numLines = new Set();
                  for (const index in calculatedOffsets.current) {
                    const { y } = calculatedOffsets.current[index];
                    numLines.add(y);
                  }
                  //console.log("calculated numLines: ", numLines.size);
                  const numLinesSize = numLines.size < 3 ? numLines.size + 1 : numLines.size;
                  const linesHeight = numLinesSize * lineHeight; // total height of all lines (including gaps)
                  //console.log("linesHeight: ", linesHeight, "numLinesSize: ", numLinesSize);
                  // now, use the calculatedOffsets to initialize the offsets shared values for each word,
                  // this will set up the initial positions and sizes for each word that the drag-and-drop 
                  // system will use to position words during gestures.

                  for (const index in calculatedOffsets.current) {
                    const { x, y, width } = calculatedOffsets.current[index];
                    // offsets is an array of shared value objects — one per word
                    // — used by Reanimated to drive the drag-and-drop animations on the UI thread. 
                    // Each entry looks like:
                    // {
                    //   order: useSharedValue(0),
                    //   width: useSharedValue(0),
                    //   originalX: useSharedValue(0),
                    //   originalY: useSharedValue(0),

                    // Now, initialize each word's offset with its measured position (from calculatedOffsets):
                    // to set up the shared values that ClickableWordNew will use to position words during gestures.
                    const offset = offsets[index];
                    // offset.order.value = -1 — marks the word as not yet placed in the answer area (unordered/in word bank)
                    offset.order.value = -1;
                    offset.width.value = width;
                    console.log(`Here1 x = ${x}  and y = ${y} for index ${index}`);
                    offset.originalX.value = x;
                    // wordBankOffsetY is added to the originalY so that the word bank
                    // (where words start) appears below the answer lines
                    // since the coordinate system is relative to the ComputeWordLayout container, 
                    // we need to add the total height of the answer lines (linesHeight) and the wordBankOffsetY to the originalY to position the word bank below the answer area with some gap in between.
                   
                    console.log(`Here2  y = ${y} for index ${index}`);
                    offset.originalY.value = y + linesHeight + wordBankOffsetY;
                    console.log(` Here3 wordBankOffsetY = ${wordBankOffsetY} and linesHeight = ${linesHeight} for index ${index}`);
                    console.log(" Here4 originalY will be set to: ", y + linesHeight + wordBankOffsetY, " for index ", index);

                    // note that offset.x and offset.y WILL BE UPDATED during tap gesture/dragging, 

                    // but originalX and originalY remain constant to represent the word's initial position
                    // in the word bank before any dragging/clicking occurs.

                    //console.log(`Initialized offsets for word index ${index}: order=${offset.order.value}, width=${offset.width.value}, originalX=${offset.originalX.value}, originalY=${offset.originalY.value}`);
                    
                    // the purpose of offsetStyles is to set the initial absolute positioning styles
                    // for each word in the word bank,
                    offsetStyles.current[index] = {
                      position: "absolute",
                      height: wordHeight,
                      top: y + linesHeight + wordBankOffsetY * 2,
                      left: x + wordGap,
                      width: width - wordGap * 2,
                    };
                    //console.log("offsetStyles for index ", index, ": ", offsetStyles.current[index]);
                  }
                  setTimeout(() => {
                    console.log("Time is up.  Calling onLayout with numLines: ", numLines.size, " and offsetStyles: ", offsetStyles.current);
                    onLayout({ numLines: numLines.size, wordStyles: offsetStyles.current });
                  }, 1600);
                }
                
              }}
            >
              {child}
            </View>
          );
        })}
      </View>
    </>
  );
}

/*
By default, all components have flex: 0.
This means the component will only take up the MINIMUM space 
required by its content (its height/width or the size of its children-
the word chips in this case).
It will not expand to fill extra space.
*/

const styles = StyleSheet.create({
  computeWordLayoutContainer: {
    backgroundColor: "orange",  // DEBUG
    flexDirection: "row", // 
    flexWrap: "wrap",
    opacity: 20,
    width: "100%",
    flex: 0 , //default is 0, see explanation above, 
  },
  center: {
    justifyContent: "center",
  },
  right: {
    justifyContent: "flex-end",
  },
  left: {
    justifyContent: "flex-start",
  },
});
