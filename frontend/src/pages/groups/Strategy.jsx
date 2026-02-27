import { Target, Map, IndianRupee } from 'lucide-react';
import TabContainer from '../../components/TabContainer';
import StrategicPlanning from '../StrategicPlanning';
import FinancialInsights from '../FinancialInsights';

export default function Strategy() {
    const tabs = [
        { label: 'Strategic Planning', icon: Map, component: <StrategicPlanning embedded /> },
        { label: 'Financial Insights', icon: IndianRupee, component: <FinancialInsights embedded /> },
    ];

    return (
        <TabContainer
            tabs={tabs}
            icon={Target}
            title="Strategy"
            subtitle="Scenario planning and financial impact analysis"
        />
    );
}
