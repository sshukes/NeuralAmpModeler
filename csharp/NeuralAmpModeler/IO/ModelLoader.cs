using System.Text.Json;
using NeuralAmpModeler.Model;

namespace NeuralAmpModeler.IO;

public sealed class ModelLoader
{
    private readonly ConsoleLogger _logger;

    public ModelLoader(ConsoleLogger logger)
    {
        _logger = logger;
    }

    public NeuralAmpModel Load(string path)
    {
        _logger.Info($"Loading model from {path}...");
        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Model file not found: {path}");
        }

        var json = File.ReadAllText(path);
        var description = JsonSerializer.Deserialize<ModelDescription>(json) ?? throw new InvalidOperationException("Invalid model file.");
        Validate(description);

        var layers = description.Layers.Select(layer => new DenseLayer(layer.ToMatrix(), layer.Bias, layer.Activation));
        var readableName = description.Name ?? Path.GetFileNameWithoutExtension(path);
        return new NeuralAmpModel(layers, description.OutputGain, readableName);
    }

    private void Validate(ModelDescription description)
    {
        if (description.InputSize <= 0)
        {
            throw new InvalidOperationException("Model input size must be greater than zero.");
        }

        foreach (var (layer, index) in description.Layers.Select((layer, index) => (layer, index)))
        {
            if (layer.Bias.Length != layer.Weights.Length)
            {
                throw new InvalidOperationException($"Layer {index} bias length does not match weight rows.");
            }

            if (layer.Weights.Any(row => row.Length != description.InputSize))
            {
                throw new InvalidOperationException($"Layer {index} weight columns must match InputSize {description.InputSize}.");
            }
        }
    }

    private sealed record ModelDescription(int InputSize, ModelLayer[] Layers, double OutputGain, string? Name)
    {
        public sealed record ModelLayer(double[][] Weights, double[] Bias, string Activation)
        {
            public double[,] ToMatrix()
            {
                var rows = Bias.Length;
                var cols = Weights.FirstOrDefault()?.Length ?? 0;
                var matrix = new double[rows, cols];
                for (var r = 0; r < rows; r++)
                {
                    for (var c = 0; c < cols; c++)
                    {
                        matrix[r, c] = Weights[r][c];
                    }
                }

                return matrix;
            }
        }
    }
}
