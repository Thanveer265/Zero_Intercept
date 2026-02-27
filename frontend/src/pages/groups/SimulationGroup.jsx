import { FlaskConical, Building2, Beaker } from 'lucide-react';
import TabContainer from '../../components/TabContainer';
import DigitalTwin from '../DigitalTwin';
import SimulationLab from '../SimulationLab';

export default function SimulationGroup() {
    const tabs = [
        { label: 'Digital Twin', icon: Building2, component: <DigitalTwin embedded /> },
        { label: 'Simulation Lab', icon: Beaker, component: <SimulationLab embedded /> },
    ];

    return (
        <TabContainer
            tabs={tabs}
            icon={FlaskConical}
            title="Simulation"
            subtitle="Digital twin visualization and staffing simulations"
        />
    );
}
