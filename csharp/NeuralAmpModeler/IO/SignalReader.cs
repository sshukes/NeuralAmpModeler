namespace NeuralAmpModeler.IO;

public static class SignalReader
{
    public static IReadOnlyList<double> Read(string path)
    {
        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Input signal not found: {path}");
        }

        var samples = new List<double>();
        foreach (var line in File.ReadLines(path))
        {
            if (double.TryParse(line.Trim(), out var value))
            {
                samples.Add(value);
            }
        }

        if (samples.Count == 0)
        {
            throw new InvalidOperationException($"Input file {path} did not contain any valid samples.");
        }

        return samples;
    }
}
