namespace NeuralAmpModeler.Model;

public sealed class NeuralAmpModel
{
    private readonly IReadOnlyList<DenseLayer> _layers;
    private readonly double _outputGain;

    public string Description { get; }

    public NeuralAmpModel(IEnumerable<DenseLayer> layers, double outputGain, string description)
    {
        _layers = layers.ToList();
        _outputGain = outputGain;
        Description = description;
    }

    public IReadOnlyList<double> Process(IReadOnlyList<double> input)
    {
        var output = new List<double>(input.Count);
        foreach (var sample in input)
        {
            var vector = new[] { sample };
            foreach (var layer in _layers)
            {
                vector = layer.Forward(vector);
            }

            output.Add(vector[0] * _outputGain);
        }

        return output;
    }
}
