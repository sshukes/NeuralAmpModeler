namespace NeuralAmpModeler.Model;

internal sealed class DenseLayer
{
    public double[,] Weights { get; }
    public double[] Bias { get; }
    public string Activation { get; }

    public DenseLayer(double[,] weights, double[] bias, string activation)
    {
        Weights = weights;
        Bias = bias;
        Activation = activation;
    }

    public double[] Forward(double[] input)
    {
        var output = new double[Bias.Length];
        for (var row = 0; row < Bias.Length; row++)
        {
            var sum = Bias[row];
            for (var col = 0; col < input.Length; col++)
            {
                sum += input[col] * Weights[row, col];
            }

            output[row] = ApplyActivation(sum);
        }

        return output;
    }

    private double ApplyActivation(double value)
    {
        return Activation.ToLowerInvariant() switch
        {
            "tanh" => Math.Tanh(value),
            "relu" => Math.Max(0, value),
            "sigmoid" => 1.0 / (1.0 + Math.Exp(-value)),
            _ => value
        };
    }
}
