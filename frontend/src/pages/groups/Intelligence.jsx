import { BrainCircuit, TrendingUp, Heart, Cpu } from 'lucide-react';
import TabContainer from '../../components/TabContainer';
import PredictiveInsights from '../PredictiveInsights';
import Sentiment from '../Sentiment';
import OptimizationEngine from '../OptimizationEngine';

export default function Intelligence() {
    const tabs = [
        { label: 'Predictive Insights', icon: TrendingUp, component: <PredictiveInsights embedded /> },
        { label: 'Sentiment', icon: Heart, component: <Sentiment embedded /> },
        { label: 'Optimization', icon: Cpu, component: <OptimizationEngine embedded /> },
    ];

    return (
        <TabContainer
            tabs={tabs}
            icon={BrainCircuit}
            title="Intelligence"
            subtitle="Predictive analytics, sentiment analysis, and optimization"
        />
    );
}
