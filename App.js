// ===========================================
// App.js (Main navigation setup with dark theme)
// ===========================================
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import Login from './screens/Login';
import Home from './screens/Home';
import Profile from './screens/Profile';
import Chat from './screens/Chat';
import AnimeDetail from './screens/AnimeDetail';

const Stack = createNativeStackNavigator();

// Custom dark theme matching your app design
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#3B82F6',
    background: '#0A0A0A',
    card: '#1A1A1A',
    text: '#FFFFFF',
    border: '#262626',
    notification: '#3B82F6',
  },
};

export default function App() {
  useEffect(() => {
    // Set status bar style
    StatusBar.setBarStyle('light-content');
  }, []);

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#0A0A0A" 
        translucent={false}
      />
      <NavigationContainer theme={CustomDarkTheme}>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: {
              backgroundColor: '#0A0A0A',
            },
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={Login}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen 
            name="Home" 
            component={Home}
            options={{
              gestureEnabled: false, // Prevent swipe back from Home
            }}
          />
          <Stack.Screen 
            name="AnimeDetail" 
            component={AnimeDetail}
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen 
            name="Profile" 
            component={Profile}
            options={{
              animation: 'slide_from_left',
            }}
          />
          <Stack.Screen 
            name="Chat" 
            component={Chat}
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}