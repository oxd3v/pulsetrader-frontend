import { create } from 'zustand';
import { ORDER_TYPE } from '@/type/order';

type IndicatorOnChartType = {
    resolution: string,
    period: number,
    indicatorName: string
}


export const store = create((set) => ({
    ordersOnChart: [],
    setOrdersOnChart: (ordersOnChart:ORDER_TYPE[]) => set({ ordersOnChart }),
    indicatorOnChart: null,
    setIndicatorOnChart: (indicatorOnChart:IndicatorOnChartType | null) => set({ indicatorOnChart })
}))

export const useChartDataStore = store;