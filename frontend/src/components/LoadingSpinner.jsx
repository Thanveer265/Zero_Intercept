import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading data...' }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
        >
            <Loader2 size={36} className="text-primary animate-spin mb-3" />
            <p className="text-sm text-text-secondary">{message}</p>
        </motion.div>
    );
}
