import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';

function CustomDrawerContent(props: any) {
  const { colors } = useTheme();
  return (
    <View style={[styles.drawerContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.drawerTitle, { color: colors.text }]}>CareVity</Text>
        <Text style={[styles.drawerSubtitle, { color: colors.primary }]}>AI Digital Twin</Text>
      </View>
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
    </View>
  );
}

export default function DrawerLayout() {
  const { colors } = useTheme();
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: { width: '60%' },
        headerStyle: {
          backgroundColor: colors.background,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: 'Outfit_600SemiBold',
          color: colors.text,
        },
        drawerActiveBackgroundColor: colors.primary + '1A', // 10% opacity
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: {
          fontFamily: 'Outfit_600SemiBold',
          fontSize: 16,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />
        }}
      />
      <Drawer.Screen
        name="core-tasks"
        options={{
          title: 'Daily Constants',
          drawerIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />
        }}
      />
      <Drawer.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          drawerIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />
        }}
      />
      <Drawer.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          drawerIcon: ({ color, size }) => <Ionicons name="podium" size={size} color={color} />
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: 'My Profile',
          drawerIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingTop: 50,
    
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  drawerTitle: {
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
  },
  drawerSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 4,
  },
  drawerItems: {
    flex: 1,
  },
});
