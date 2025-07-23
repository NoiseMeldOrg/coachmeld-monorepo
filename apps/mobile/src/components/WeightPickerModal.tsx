import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface WeightPickerModalProps {
  visible: boolean;
  value: number;
  units: 'imperial' | 'metric';
  onConfirm: (weight: number) => void;
  onCancel: () => void;
  title?: string;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export const WeightPickerModal: React.FC<WeightPickerModalProps> = ({
  visible,
  value,
  units,
  onConfirm,
  onCancel,
  title = 'Weight',
}) => {
  const { theme } = useTheme();
  const [selectedWeight, setSelectedWeight] = useState(value);
  
  // Update selected weight when value prop changes
  useEffect(() => {
    setSelectedWeight(value);
  }, [value]);
  const scrollViewRef = useRef<ScrollView>(null);

  const weightUnit = units === 'imperial' ? 'lbs' : 'kg';
  const minWeight = units === 'imperial' ? 50 : 20;
  const maxWeight = units === 'imperial' ? 500 : 225;
  const step = units === 'imperial' ? 1 : 0.5;
  
  // Generate weight options
  const weightOptions: number[] = [];
  for (let w = minWeight; w <= maxWeight; w += step) {
    weightOptions.push(w);
  }

  useEffect(() => {
    if (visible && scrollViewRef.current) {
      // Find the index of the current value
      const index = weightOptions.findIndex(w => Math.abs(w - value) < step / 2);
      if (index >= 0) {
        // Scroll to the current value
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: index * ITEM_HEIGHT,
            animated: false,
          });
        }, 100);
      }
    }
  }, [visible, value]);

  const handleConfirm = () => {
    onConfirm(selectedWeight);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[styles.container, { backgroundColor: theme.surface }]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
              <Text style={[styles.headerButton, { color: theme.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7}>
              <Text style={[styles.headerButton, { color: theme.primary }]}>
                Set
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <View style={styles.pickerColumn}>
              <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                contentContainerStyle={{
                  paddingVertical: ITEM_HEIGHT * 2,
                }}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                  const weight = weightOptions[index];
                  if (weight) {
                    setSelectedWeight(weight);
                  }
                }}
              >
                {weightOptions.map((weight, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedWeight(weight);
                      scrollViewRef.current?.scrollTo({
                        y: index * ITEM_HEIGHT,
                        animated: true,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: theme.text },
                        selectedWeight === weight && styles.selectedItemText,
                        selectedWeight === weight && { color: theme.primary },
                      ]}
                    >
                      {weight % 1 === 0 ? weight.toString() : weight.toFixed(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.unit, { color: theme.textSecondary }]}>{weightUnit}</Text>
              <View style={[styles.selectionIndicator, { borderColor: theme.primary }]} />
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  pickerColumn: {
    height: PICKER_HEIGHT,
    position: 'relative',
    alignItems: 'center',
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  pickerItemText: {
    fontSize: 20,
    fontWeight: '400',
  },
  selectedItemText: {
    fontSize: 24,
    fontWeight: '600',
  },
  unit: {
    position: 'absolute',
    right: 60,
    top: PICKER_HEIGHT / 2 - 10,
    fontSize: 20,
    fontWeight: '600',
  },
  selectionIndicator: {
    position: 'absolute',
    left: 30,
    right: 30,
    top: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2,
    height: ITEM_HEIGHT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    pointerEvents: 'none',
  },
});