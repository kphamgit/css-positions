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
  offsets,  // shared values, to be modified in this component with the measured word positions/sizes
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
                //console.log("\n<<<<<<<<<--------- ComputeWordLayout: onLayout for index ", index, ": x=", x, "y=", y, "width=", width, "height=", height);
                calculatedOffsets.current[index] = { width, height, x, y };
             
                //console.log("calculatedOffsets for index ", index, ": ", calculatedOffsets.current[index]);
                // Reminder: index points to the current word being measured, 
                // which corresponds to the same index in the "children" array 
                // (the array of WordContext.Provider components that wrap each Word component)
              
                if (Object.keys(calculatedOffsets.current).length === children.length) {
                  console.log("All words measured (width, height, x, y), calculating layout (relative to computeWordLayoutContainer)");
                  console.log(" calculatedOffsets : ");
                    for (const index in calculatedOffsets.current) {
                      const { x, y, width, height } = calculatedOffsets.current[index];
                        console.log(`####### calculatedOffsets (relative to computeWordLayoutContainer) for word index ${index}: x=${x}, y=${y}, width=${width}, height=${height}`);
                    }

                  console.log(" All the words have been displayed and therefore measured, so now we have the width, x, and y for each word saved in calculatedOffsets.")
                  /*
                    all the words have been displayed and therefore measured, so now we have the width, x, and y for each word 
                    saved in calculatedOffsets.current.
                  */
                 
                  console.log(" Use calculatedOffsets to determine how many lines of words there are");
                  console.log(" We need to know the number of lines to calculate the total height of the answer lines");
                  // (linesHeight) so that we can position the word bank below the answer lines with some gap in between.
                  const numLines = new Set();
                  for (const index in calculatedOffsets.current) {
                    const { y } = calculatedOffsets.current[index];
                    numLines.add(y);
                  }
                  console.log("Calculated numLines: ", numLines.size);
                  const numLinesSize = numLines.size < 3 ? numLines.size + 1 : numLines.size;
                  const linesHeight = numLinesSize * lineHeight; // total height of all lines (including gaps)
                  console.log(" Adjust numLines to be at least 3 to ensure enough space for the word bank, so numLinesSize is: ", numLinesSize);
                  //console.log("linesHeight: ", linesHeight, "numLinesSize: ", numLinesSize);
                  // now, use the calculatedOffsets to initialize the offsets shared values for each word,
                  // this will set up the initial positions and sizes for each word that the drag-and-drop 
                  // system will use to position words during gestures.

                  console.log(" Start initializing shared values (offsets) for each word based on calculatedOffsets. ")
                  console.log(" This will set up the shared values that ClickableWordNew will use to position words during gestures.");
                  console.log(" offsets before calculating layout: ");
                  offsets.forEach((o, i) => {
                    console.log(`index ${i}: order=${o.order.value}, x=${o.x.value}, y=${o.y.value}, originalX=${o.originalX.value}, originalY=${o.originalY.value}`);
                  });
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
                    console.log(" &&&&&&&&&&&&&&&&&&&&&&&&&&&&&& Here4 originalY will be set to: ", y + linesHeight + wordBankOffsetY, " for index ", index);

                    // note that offset.x and offset.y WILL BE UPDATED during tap gesture/dragging, 
                    // but originalX and originalY remain constant to represent the word's initial position
                    // in the word bank before any dragging/clicking occurs.

                    //console.log(`Initialized offsets for word index ${index}: order=${offset.order.value}, width=${offset.width.value}, originalX=${offset.originalX.value}, originalY=${offset.originalY.value}`);
                    
                    // the purpose of offsetStyles is to set the initial absolute positioning styles
         
                    // for each word in the word bank,
                    offsetStyles.current[index] = {
                      position: "absolute",
                      // position the words in the word bank with absolute positioning relative to their parent container
                      // (ComputeWordLayout), using the measured x and y plus the calculated offset for the word bank 
                      height: wordHeight,
                      top: y + linesHeight + wordBankOffsetY * 2, // top is needed for absolute positioning, 
                      // and is set to the word's measured y position plus the total height of the answer
                      //  lines and the word bank offset to position it in the word bank area below the answer lines
                      left: x + wordGap, // left is needed for absolute positioning, 
                      // and is set to the word's measured x position plus a word gap to add 
                      // some spacing from the left edge of the container
                      width: width - wordGap * 2,  // width is set to the measured width of the word minus 
                      // some gap on both sides to add spacing between words in the word bank
                    };
                    //console.log("offsetStyles for index ", index, ": ", offsetStyles.current[index]);
                  }
                  //offsets.forEach((o, i) => {
                    // KPHAM: note that the following console log will not show the updated values of offsets because offsets is an array of 
                    // shared value objects, and the .value properties are updated asynchronously by Reanimated on the UI thread.
                    // this console.log runs immediately after on the JS thread, before those writes have actually applied.
                    // therefore it will show the initial values of offsets (with order=-1 and width set, but x and y still at their initial values) 
                    // rather than the updated values that was updated in the for loop above. 
                    // --->>> won't give you updated values:
                    //        console.log(`index ${i}: order=${o.order.value}, width=${o.width.value}, originalX=${o.originalX.value}, originalY=${o.originalY.value}`);
                  //});
                  console.log("Now starting timeout to call onLayout for parent...");
                  setTimeout(() => {
                    console.log("Time is up.  Calling onLayout with numLines: ", numLines.size, " and offsetStyles: ", offsetStyles.current);
                    onLayout({ numLines: numLines.size, wordStyles: offsetStyles.current });
                  }, 16000);
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
    //left: 100, // DEBUG to test that the x positions of words are relative to the ComputeWordLayout container, 
    // this value would shift computeWordLayoutContainer 100 pixels to the right, 
    // However, the relative x positions of the words inside the container should remain the same,
    // which would confirm that the word positions are calculated relative to the ComputeWordLayout 
    // container as intended.
    flexWrap: "wrap", // flexWrap affects how the words are laid out inside the ComputeWordLayout container.
    // with flexWrap: "wrap", the words will automatically wrap to the next line when they reach the edge of the container,
    opacity: 20,
    width: "100%", // width=100% makes the ComputeWordLayout container take up the full width of its parent, 
    // which is important for calculating word positions relative to the container and for
    //  ensuring that words wrap correctly based on the CONTAINER WIDTH.
    flex: 0 , //default is 0, see explanation above, 
    // position: 'relative' (default)
    // a relative position is needed so that the absolute positioning of 
    // its children (the words in ClickableWordNew) is calculated relative to it
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
