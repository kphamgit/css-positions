import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Child1 from './Child1';


export default function Home() {
  const isUrgent = true;
 


  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        
        <Child1 />
  
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    padding: 0,
    backgroundColor: 'green',
  },
});