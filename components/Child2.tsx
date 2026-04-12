import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import DebugGrid from './DebugGrid';

function Child2() {
      const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
        const onLayout = (e: LayoutChangeEvent) => {
            const { width, height } = e.nativeEvent.layout;
            setDimensions({ width, height });
          };

/* IMPORTANT:
Put DebugGrid inside Child2's View

And in DebugGrid, use position: 'absolute' with top/left/right/bottom: 0
to make DebugGrid to its nearest positioned ancestor (Child2's View)

          */

  return (
    <View style={styles.container} onLayout={onLayout}>
      <DebugGrid width={dimensions.width} height={dimensions.height} />
      <Text>Child2eeeee</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9c6c9',
    width: '100%',
  },
})

export default Child2