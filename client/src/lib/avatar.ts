export function generateInitials(name: string): string {
  if (!name) return "";
  const parts = name.split(" ");
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function getAvatarGradient(name: string): string {
  if (!name) return "bg-gray-500";
  const gradients = [
    "from-blue-500 to-purple-600",
    "from-green-400 to-blue-500",
    "from-pink-500 to-orange-500",
    "from-teal-400 to-yellow-500",
    "from-indigo-500 to-pink-500",
  ];
  const charCodeSum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[charCodeSum % gradients.length];
}
