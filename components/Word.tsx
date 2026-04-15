import { useContext, useEffect } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import WordContext from "./WordContext";
import { colors } from "./colors";

export interface WordProps {
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Word({ containerStyle, textStyle }: WordProps) {
  const { wordHeight, text, wordGap } = useContext(WordContext);

  useEffect(() => {
    console.log("\nWord rendered with text:", text, 'and INPUT wordHeight: ', wordHeight, "INPUT wordGap",wordGap);
    }, [text, wordHeight, wordGap]);

    //style={[{ margin: wordGap, marginBottom: wordGap * 2 }, styles.container, containerStyle]}
//style={[{ height: wordHeight, margin: wordGap, marginBottom: wordGap * 2 }, styles.container, containerStyle]}
  return (
    <View
    style={[{ height: wordHeight, margin: wordGap, marginBottom: wordGap * 2 }, styles.container, containerStyle]}
    >
      <Text style={[styles.text, textStyle]} allowFontScaling={false} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    marginBottom: 5,
    backgroundColor: colors.white,
    borderColor: colors.blue,
    borderWidth: 2,
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 2,
    flex: 0,  // default is 'flex: 0', but explicitly set here to emphasize that 
    //  a Word will take up only the space required to fit its text content (plus the horizontal padding),
    //  and will not stretch to fill extra space in the container.
  },
  text: {
    fontSize: 16,
  },
});