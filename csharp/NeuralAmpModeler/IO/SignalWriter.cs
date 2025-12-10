namespace NeuralAmpModeler.IO;

public static class SignalWriter
{
    public static void Write(string path, IReadOnlyList<double> samples)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path) ?? ".");
        File.WriteAllLines(path, samples.Select(v => v.ToString("F6")));
    }
}
