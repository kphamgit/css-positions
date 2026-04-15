import { AudioPlayer, AudioSource } from 'expo-audio';
import React, { memo, type ReactElement, useCallback, useState } from 'react';
import { StyleSheet, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { type Offset } from "./Layout";
import type { DuoWordAnimatedStyle, OnDropFunction } from "./animated_type";

export interface ClickableWordNewProps {
  onDrop?: OnDropFunction;
  offsets: Offset[];
  children: ReactElement<{ id: number }>;
  index: number;
  wordHeight: number;
  wordBankOffsetY: number;
  fillSlotPositions: {x: number, y: number}[];
  parentFunc: () => void;
}

const ClickableWordNew = ({
  offsets,
  index,
  children,
  wordHeight,
  wordBankOffsetY,
  fillSlotPositions,
  onDrop,
  parentFunc,
}: ClickableWordNewProps) => {
  const offset = offsets[index];
  const isAnimating = useSharedValue(false);
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

  /*
why are translateX (line 63) and translateY (line 71) are derivedValues?
Because translateX and translateY need to reactively recompute whenever the shared values 
they depend on change.
useDerivedValue sets up a reactive computation on the UI thread — 
whenever isInBank.value, offset.originalX.value, offset.x.value etc. change, 
translateX and translateY automatically recompute and withTiming fires to animate
 to the new target.

If they were just regular variables instead:
const translateX = offset.originalX.value; // computed once, never updates
They would only capture the value at render time and never react to changes driven by taps or gestures on the UI thread.

useDerivedValue is essentially the worklet equivalent of useMemo — but reactive to shared value changes on the UI thread rather than React state changes on the JS thread.
  */

  const translateX = useDerivedValue(() =>
    withTiming(
      isInBank.value ? offset.originalX.value : offset.x.value,
      { duration: 250 },
      () => (isAnimating.value = false),
    )
  );

  const translateY = useDerivedValue(() => {
    //console.log("????????????? translateY: isInBank=", isInBank.value, "originalY=", offset.originalY.value, "y=", offset.y.value, "wordBankOffsetY=", wordBankOffsetY);
    // if word is in bank, translateY animates to originalY + wordBankOffsetY
    //  (position in the bank)
    // if not, translateY animates to y (position in the answer area, which is computed 
    // by calculateLayout based on the word's order and the container width)
    return withTiming(
      isInBank.value ? offset.originalY.value + wordBankOffsetY : offset.y.value,
      { duration: 250 },
      () => (isAnimating.value = false),
    );
  });
  
  const style = useAnimatedStyle(() => {
    const style: DuoWordAnimatedStyle & ViewStyle = {
      position: "absolute",
      top: 0,  // top is needed for absolute positioning, but actual position is determined by translateX/Y
      left: 1, // left is needed for absolute positioning, but actual position is determined by translateX/Y
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
    width: offset.width.value + 2,  // use chip width for the bank ghost
    height: wordHeight,
    opacity: withTiming(isInBank.value ? 0 : 0.3, { duration: 500 }),
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

  const playAudio = () => {
    const mySrc: AudioSource = { uri: mp3 };
    player?.replace(mySrc);
    player?.play();
    player?.remove();
  };

  const tapGesture = Gesture.Tap().onStart(() => {
    runOnJS(playAudio)();
    runOnJS(parentFunc)();

    // console.log("\n ClickableWordNew tapGesture ENTRY - for word at INDEX ", index, ' offsets state:');
    //offsets.forEach((o, i) => {
     // console.log(`index ${i}: order=${o.order.value}, x=${o.x.value}, y=${o.y.value}, originalX=${o.originalX.value}, originalY=${o.originalY.value}`);
    //});
    if (isInBank.value) {
      // console.log("\n ClickableWordNew tapGesture - word is in bank, trying to move to answer area. Finding first available fill slot...");
      // find first fill slot not occupied by another chip
      let slotIndex = -1;
      for (let i = 0; i < fillSlotPositions.length; i++) {
        const isOccupied = offsets.some(o => o.order.value === i);
        if (!isOccupied) {
          slotIndex = i;
          break;
        }
      }
      // console.log("Found fill slot index: ", slotIndex);
      if (slotIndex !== -1) {
        offset.order.value = slotIndex;
        const slotWidth = offset.height.value; // maxWidth stored in offset.height
        const chipWidth = offset.width.value;
        offset.x.value = fillSlotPositions[slotIndex].x + (slotWidth - chipWidth) / 2 - 1;
        offset.y.value = fillSlotPositions[slotIndex].y;
      }
    } else {
      offset.order.value = -1;
    }

    isAnimating.value = true;
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
