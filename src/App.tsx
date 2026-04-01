import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, getDoc, getDocFromServer, deleteDoc, writeBatch, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import BottomNav from './components/BottomNav';
import Dashboard from './views/Dashboard';
import Students from './views/Students';
import Records from './views/Records';
import Login from './views/Login';
import { Student, ClassRecord, TabType, PurchaseRecord } from './types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });

    // Test connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const studentsQuery = query(collection(db, 'students'), orderBy('joinDate', 'desc'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'students'));

    const recordsQuery = query(collection(db, 'records'), orderBy('createdAt', 'desc'));
    const unsubscribeRecords = onSnapshot(recordsQuery, (snapshot) => {
      const recordsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassRecord));
      setRecords(recordsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'records'));

    const purchasesQuery = query(collection(db, 'purchase_records'), orderBy('createdAt', 'desc'));
    const unsubscribePurchases = onSnapshot(purchasesQuery, (snapshot) => {
      const purchasesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseRecord));
      setPurchaseRecords(purchasesData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'purchase_records'));

    return () => {
      unsubscribeStudents();
      unsubscribeRecords();
      unsubscribePurchases();
    };
  }, [user]);

  const handleLoginSuccess = () => {
    // Auth state is handled by onAuthStateChanged
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const studentsWithRemaining = students.map(student => {
    const completedCount = records.filter(
      r => r.studentName === student.name && r.status === 'completed'
    ).length;
    return {
      ...student,
      remainingClasses: (student.totalClasses || 0) - completedCount
    };
  });

  if (!isAuthReady) return null;

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const handleAddStudent = async (studentData: Omit<Student, 'id' | 'joinDate'>) => {
    try {
      const path = 'students';
      const docRef = await addDoc(collection(db, path), {
        ...studentData,
        joinDate: new Date().toISOString().split('T')[0]
      });

      // Create initial purchase record
      await addDoc(collection(db, 'purchase_records'), {
        studentId: docRef.id,
        studentName: studentData.name,
        purchasedAmount: studentData.totalClasses,
        purchaseDate: new Date().toISOString().split('T')[0],
        previousTotal: 0,
        type: 'initial',
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'students');
    }
  };

  const handleScheduleClass = async (recordData: Omit<ClassRecord, 'id' | 'createdAt' | 'status'>) => {
    try {
      const path = 'records';
      await addDoc(collection(db, path), {
        ...recordData,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'records');
    }
  };

  const handleSignRecord = async (id: string, coachSig: string, studentSig: string) => {
    try {
      const recordRef = doc(db, 'records', id);
      await updateDoc(recordRef, {
        status: 'completed',
        coachSignature: coachSig,
        studentSignature: studentSig,
        signedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `records/${id}`);
    }
  };

  const handleRenewClasses = async (studentId: string, additionalClasses: number) => {
    try {
      const studentRef = doc(db, 'students', studentId);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        const studentData = studentSnap.data() as Student;
        await updateDoc(studentRef, {
          totalClasses: (studentData.totalClasses || 0) + additionalClasses
        });

        // Create renewal purchase record
        await addDoc(collection(db, 'purchase_records'), {
          studentId: studentId,
          studentName: studentData.name,
          purchasedAmount: additionalClasses,
          purchaseDate: new Date().toISOString().split('T')[0],
          previousTotal: studentData.totalClasses || 0,
          type: 'renewal',
          createdAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const handleUpdateStudentName = async (studentId: string, newName: string) => {
    try {
      const studentRef = doc(db, 'students', studentId);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        const oldName = studentSnap.data().name;
        
        // Update student name
        await updateDoc(studentRef, {
          name: newName
        });

        // Update all records with the old name
        const recordsQuery = query(collection(db, 'records'), where('studentName', '==', oldName));
        const recordsSnap = await getDocs(recordsQuery);
        
        const batch = writeBatch(db);
        recordsSnap.forEach(doc => {
          batch.update(doc.ref, { studentName: newName });
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      const studentRef = doc(db, 'students', studentId);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        const studentName = studentSnap.data().name;
        
        // Delete student
        await deleteDoc(studentRef);

        // Delete all records associated with the student
        const recordsQuery = query(collection(db, 'records'), where('studentName', '==', studentName));
        const recordsSnap = await getDocs(recordsQuery);
        
        const batch = writeBatch(db);
        recordsSnap.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
    }
  };

  const handleUpdateRecord = async (id: string, date: string, time: string) => {
    try {
      const recordRef = doc(db, 'records', id);
      await updateDoc(recordRef, {
        date,
        time
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `records/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center sm:p-4 font-sans text-slate-900 relative overflow-hidden">
      {/* Techy Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Ambient Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute top-[40%] right-[-20%] w-[50%] h-[50%] rounded-full bg-indigo-400/10 blur-[100px]" />
      </div>

      {/* Mobile App Container */}
      <div className="w-full h-[100dvh] sm:h-[844px] sm:max-w-[390px] bg-white/70 backdrop-blur-3xl sm:rounded-[40px] sm:shadow-[0_0_50px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col border-slate-200/50 sm:border-[8px]">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden pb-24 sm:pb-16 z-10">
          {activeTab === 'dashboard' && <Dashboard students={studentsWithRemaining} records={records} onNavigate={setActiveTab} onSignRecord={handleSignRecord} onUpdateRecord={handleUpdateRecord} onScheduleClass={handleScheduleClass} onAddStudentClick={() => { setActiveTab('students'); setIsAddingStudent(true); }} />}
          {activeTab === 'students' && <Students students={studentsWithRemaining} records={records} purchaseRecords={purchaseRecords} isAddingStudent={isAddingStudent} onAddModalClose={() => setIsAddingStudent(false)} onAddStudent={handleAddStudent} onScheduleClass={handleScheduleClass} onRenewClasses={handleRenewClasses} onDeleteStudent={handleDeleteStudent} onUpdateRecord={handleUpdateRecord} onUpdateStudentName={handleUpdateStudentName} />}
          {activeTab === 'records' && <Records records={records} onSignRecord={handleSignRecord} onUpdateRecord={handleUpdateRecord} />}
        </div>

        {/* Bottom Navigation */}
        <div className="z-20">
          <BottomNav activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </div>
    </div>
  );
}
