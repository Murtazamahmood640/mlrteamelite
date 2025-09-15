import mongoose from 'mongoose';

export async function connectDB(uri) {
  if (!uri) throw new Error('MONGODB_URI is required');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    autoIndex: true,
    maxPoolSize: 10
  });
  return mongoose.connection;
}
