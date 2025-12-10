namespace NeuralAmpModeler.SignalProcessing;

public sealed class SignalAnalyzer
{
    public SignalStatistics Analyze(IReadOnlyList<double> samples)
    {
        if (samples.Count == 0)
        {
            throw new ArgumentException("Cannot analyze an empty signal.", nameof(samples));
        }

        double min = double.MaxValue;
        double max = double.MinValue;
        double sumSquares = 0;

        foreach (var sample in samples)
        {
            min = Math.Min(min, sample);
            max = Math.Max(max, sample);
            sumSquares += sample * sample;
        }

        var rms = Math.Sqrt(sumSquares / samples.Count);
        return new SignalStatistics(min, max, rms);
    }
}

public readonly record struct SignalStatistics(double Minimum, double Maximum, double Rms);
