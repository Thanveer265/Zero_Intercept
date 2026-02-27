import { Briefcase, BarChart3, Clock, AlertTriangle } from 'lucide-react';
import TabContainer from '../../components/TabContainer';
import WorkloadAnalytics from '../WorkloadAnalytics';
import ResolutionSLA from '../ResolutionSLA';
import RiskAlerts from '../RiskAlerts';

export default function Operations() {
    const tabs = [
        { label: 'Workload', icon: BarChart3, component: <WorkloadAnalytics embedded /> },
        { label: 'Resolution & SLA', icon: Clock, component: <ResolutionSLA embedded /> },
        { label: 'Risk & Alerts', icon: AlertTriangle, component: <RiskAlerts embedded /> },
    ];

    return (
        <TabContainer
            tabs={tabs}
            icon={Briefcase}
            title="Operations"
            subtitle="Workload monitoring, SLA compliance, and risk management"
        />
    );
}
