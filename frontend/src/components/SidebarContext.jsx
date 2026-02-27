import { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
    const [open, setOpen] = useState(false);
    const toggle = () => setOpen(prev => !prev);
    const close = () => setOpen(false);

    return (
        <SidebarContext.Provider value={{ open, toggle, close }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    return useContext(SidebarContext);
}
