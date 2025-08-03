
interface PageHeaderProps {
    title: string;
    description: string;
}

export default function PageHeader({ title, description }: PageHeaderProps) {
    return (
        <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
        </div>
    )
}
