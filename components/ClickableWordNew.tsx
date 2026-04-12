import { AudioPlayer, AudioSource } from 'expo-audio';
import React, { memo, type ReactElement, useCallback, useEffect, useState } from 'react';
import { StyleSheet, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { calculateLayout, lastOrder, type Offset, remove, useVector } from "./Layout";
import type { DuoWordAnimatedStyle, OnDropFunction } from "./animated_type";

export interface ClickableWordNewProps {
  onDrop?: OnDropFunction;
  offsets: Offset[];
  children: ReactElement<{ id: number }>;
  index: number;
  containerWidth: number;
  linesHeight: number;
  wordHeight: number;
  wordGap: number;
  wordBankOffsetY: number;
  lineGap: number;
  parentFunc: () => void;
}

const ClickableWordNew = ({
  offsets,
  index,
  children,
  containerWidth,
  linesHeight,
  wordHeight,
  wordGap,
  wordBankOffsetY,
  lineGap,
  onDrop,
  parentFunc,
}: ClickableWordNewProps) => {
  const offset = offsets[index];
  const isAnimating = useSharedValue(false);
  const translation = useVector();
  /*
tranlation manages the position of the animated chip (a word in the words bank), 
while offset manages the position of the ghost (and also serves as the source of truth for the word's position in the answer area, since its order value is used in calculateLayout to determine where the word should be).
  */
 
  const isInBank = useDerivedValue(() => offset.order.value === -1);

  const [mp3, setMp3] = useState<string>('');
  const [player, setPlayer] = useState<AudioPlayer>();

  const emitOnDrop = useCallback(() => {
    onDrop?.({
      index,
      destination: offset.order.value === -1 ? "bank" : "answered",
      position: offset.order.value,
    });
  }, [index, offset, onDrop]);

  const translateX = useDerivedValue(() =>
    withTiming(
      isInBank.value ? offset.originalX.value : offset.x.value,
      { duration: 250 },
      () => (isAnimating.value = false),
    )
  );

  const translateY = useDerivedValue(() => {
    console.log(" in useDerivedValue offsets is:")
    offsets.forEach((o, i) => {
      console.log(`index ${i}: order=${o.order.value}, x=${o.x.value}, y=${o.y.value}, originalX=${o.originalX.value}, originalY=${o.originalY.value}`);
    });

    console.log("translateY: isInBank=", isInBank.value, "originalY=", offset.originalY.value, "y=", offset.y.value, "wordBankOffsetY=", wordBankOffsetY);
    return withTiming(
      isInBank.value ? offset.originalY.value + wordBankOffsetY : offset.y.value,
      { duration: 250 },
      () => (isAnimating.value = false),
    );
  });
  
  const style = useAnimatedStyle(() => {
    const style: DuoWordAnimatedStyle & ViewStyle = {
      position: "absolute",
      top: 0,
      left: -1,
      zIndex: isAnimating.value ? 100 : Math.max(1, offset.order.value),
      width: offset.width.value + 2,
      height: wordHeight,
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    };
    return style as ViewStyle;
  });

  const ghostStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: 0,
    left: -1,
    width: offset.width.value + 2,
    height: wordHeight,
    opacity: isInBank.value ? 0 : 0.3,
    transform: [
      { translateX: offset.originalX.value },
      { translateY: offset.originalY.value + wordBankOffsetY },
    ],
  }));

  /*
  useEffect(() => {
    const word = children.key?.split('-')[0];
    const my_mp3 = `https://kphamazureblobstore.blob.core.windows.net/tts-audio/${word}.mp3`;
    setMp3(my_mp3);
    setPlayer(createAudioPlayer(my_mp3));
  }, [children]);
*/
  useEffect(() => {
    console.log("--------------> offsets state in ClickableWordNew useEffect: index =", index);
    offsets.forEach((o, i) => {
      console.log(`index ${i}: order=${o.order.value}, x=${o.x.value}, y=${o.y.value}, originalX=${o.originalX.value}, originalY=${o.originalY.value}`);
    });
  }, [offsets[index].order.value, offsets[index].x.value, offsets[index].y.value]);

  const playAudio = () => {
    const mySrc: AudioSource = { uri: mp3 };
    player?.replace(mySrc);
    player?.play();
    player?.remove();
  };

  const tapGesture = Gesture.Tap().onStart(() => {
    runOnJS(playAudio)();
    runOnJS(parentFunc)();

    console.log("\n ClickableWordNew tapGesture ENTRY - for word at INDEX ", index, ' offsets state:');
    offsets.forEach((o, i) => {
      console.log(`index ${i}: order=${o.order.value}, x=${o.x.value}, y=${o.y.value}, originalX=${o.originalX.value}, originalY=${o.originalY.value}`);
    });
    //decides whether the word is moving to the answer area or back to the bank:
    if (isInBank.value) {
      // clicked word is currently in the bank, moving to answer area: assign it the last order in the answer area + 1
      /*
Line 128: offset.order.value = lastOrder(offsets);
When the user taps a word that's currently in the bank (isInBank.value is true), 
lastOrder() assigns it a position in the answer area. 
lastOrder(offsets) scans all offsets and returns the highest order value currently in the answer area, then adds 1 — 
so the tapped word gets placed at the end of whatever words are already in the answer area.
For example, if the answer area has 2 words with order 0 and 1, lastOrder returns 2,
 and the new word gets order = 2 (placed third).
      */
      console.log("\nClickableWordNew Tapped word is in bank, let's move it answer area. FIRST, set its order to lastOrder(offsets): ", lastOrder(offsets));
      offset.order.value = lastOrder(offsets);
    } else {
      // clicked word is currently in the answer area, moving back to bank: set its order to -1 and remove it 
      // from the offsets array so that it doesn't take up space in the layout of the answer area
      offset.order.value = -1;
      remove(offsets, index);
    }

    console.log("\nClickableWordNew: After updating order value, offsets state is:");
    offsets.forEach((o, i) => {
      console.log(`index ${i}: order=${o.order.value}, x=${o.x.value}, y=${o.y.value}, originalX=${o.originalX.value}, originalY=${o.originalY.value}`);
    });

    isAnimating.value = true;
    /*
      calculateLayout  is only called when the user taps a word to move it between the bank and answer area, not during dragging (unlike in ClickAndClozeNew) — this is because with tap gestures we can jump straight to the final position instead of needing to track the intermediate positions during a drag.
      calculateLayout() recomputes the x/y positions for every word in the answer area given the updated order values. 
      This is what triggers the animated repositioning — writing to the shared values causes withTiming in translateX/translateY to fire
    */
    console.log("\nClickableWordNew tapGesture - SECOND: calling calculateLayout with updated offsets after changing order of tapped word. ");
    console.log("\nClickableWordNew Before calling calculateLayout, containerWidth=", containerWidth);
    calculateLayout(offsets, containerWidth, wordHeight, wordGap, lineGap);
    console.log("\nClickableWordNew After calling calculateLayout, containerWidth=", containerWidth);
  
    // syncs translation.x/y to the word's newly computed position.
    translation.x.value = offset.x.value;
    translation.y.value = offset.y.value;

    runOnJS(emitOnDrop)();
  });

  return (
    <>
      {/* Ghost: stays at bank position, dimmed when word has moved to answer area */}
      <Animated.View style={ghostStyle} pointerEvents="none">
        <Animated.View style={StyleSheet.absoluteFill}>{children}</Animated.View>
      </Animated.View>

      {/* Animated chip: moves between bank and answer area */}
      <Animated.View style={style}>
       
          <GestureDetector gesture={tapGesture}>
            <Animated.View style={StyleSheet.absoluteFill}>{children}</Animated.View>
          </GestureDetector>
        
      </Animated.View>
    </>
  );
};

export default memo(ClickableWordNew);
