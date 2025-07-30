
import { Button } from "../ui/button";

interface PageHeaderProps {
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    }
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className="text-muted-foreground">{description}</p>
            </div>
            {action && (
                <Button onClick={action.onClick}>{action.label}</Button>
            )}
        </div>
    )
}
