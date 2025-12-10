namespace NeuralAmpModeler;

public sealed class ConsoleLogger
{
    public void Info(string message) => Write(message, "INFO");
    public void Error(string message) => Write(message, "ERROR");
    public void Debug(string message) => Write(message, "DEBUG");

    private static void Write(string message, string level)
    {
        var timestamp = DateTime.UtcNow.ToString("HH:mm:ss");
        Console.WriteLine($"[{timestamp}] [{level}] {message}");
    }
}
