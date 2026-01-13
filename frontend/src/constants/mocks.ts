import { Appointment, TeamMember } from '../types';

export const MOCK_TEAM: TeamMember[] = [
    {
        id: 't1',
        name: 'Maria Silva',
        role: 'Leader',
        avatarColor: 'bg-purple-500',
        status: 'Working',
    },
    {
        id: 't2',
        name: 'João Santos',
        role: 'Driver',
        avatarColor: 'bg-blue-500',
        status: 'Available',
    },
    {
        id: 't3',
        name: 'Ana Oliveira',
        role: 'Helper',
        avatarColor: 'bg-pink-500',
        status: 'Break',
    },
];

export const MOCK_APPOINTMENTS_UPDATE = (appointments: Appointment[]): Appointment[] => {
    return appointments.map((app, index) => {
        // Distribute appointments among team members for demo purposes
        const assignedTo = [];
        if (index % 3 === 0) assignedTo.push('t1');
        if (index % 2 === 0) assignedTo.push('t2');
        if (index % 5 === 0) assignedTo.push('t3');

        // Ensure at least one assignment for even indices to show effect
        if (assignedTo.length === 0 && index % 2 === 0) assignedTo.push('t1');

        return {
            ...app,
            assignedTo: assignedTo.length > 0 ? assignedTo : undefined,
        };
    });
};
