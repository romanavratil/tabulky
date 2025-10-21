import NutrientForm from '../components/NutrientForm';

export default function CustomIngredientPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Create ingredient</h1>
        <p className="text-sm text-muted">
          Add your own food with accurate nutrition so you can log it instantly next time.
        </p>
      </header>
      <NutrientForm />
    </div>
  );
}
