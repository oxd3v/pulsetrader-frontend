import { create } from 'zustand';
import { OrderType } from '@/type/order';

type IndicatorOnChartType = {
    resolution: string,
    period: number,
    indicatorName: string
}


export const store = create((set) => ({
    ordersOnChart: [],
    setOrdersOnChart: (ordersOnChart:OrderType[]) => set({ ordersOnChart }),
    indicatorOnChart: null,
    setIndicatorOnChart: (indicatorOnChart:IndicatorOnChartType | null) => set({ indicatorOnChart })
}))

export const useChartDataStore = store;