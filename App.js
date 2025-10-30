// App.js - G.I SMARTS GHANA (Customer App - no payment, orders saved as Pending)
// Make sure config/firebaseConfig.js exists

import React, {useEffect, useState, useMemo} from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, TextInput, ScrollView } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import firebaseConfig from "./config/firebaseConfig";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import * as Linking from "expo-linking";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function HomeScreen({ navigation, route }) {
  const [products, setProducts] = useState([]);

  useEffect(()=>{ fetchProducts(); },[]);

  async function fetchProducts(){
    try{
      const q = query(collection(db,'products'), orderBy('createdAt','desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d=>({id:d.id, ...d.data()}));
      setProducts(list);
    }catch(e){ console.log("fetchProducts error", e); Alert.alert('Error loading products'); }
  }

  return (
    <View style={s.container}>
      <Text style={s.header}>G.I SMARTS GHANA</Text>
      <Text style={s.slogan}>Smart Choice for Smart People</Text>

      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={i=>i.id}
        renderItem={({item})=>(
          <View style={s.card}>
            <Image source={{uri: item.image || 'https://via.placeholder.com/150'}} style={s.img} />
            <Text style={s.pName}>{item.name}</Text>
            <Text style={s.pPrice}>GHS {item.price}</Text>
            <TouchableOpacity style={s.addBtn} onPress={()=>navigation.navigate('Cart', { action: 'add', product: item })}>
              <Text style={{fontWeight:'700'}}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

function RepairsScreen(){
  const [name,setName]=useState(''); const [phone,setPhone]=useState(''); const [details,setDetails]='';
  const submitRepair = async () => {
    if(!name||!phone||!details) return Alert.alert('Please fill all fields');
    try{
      await addDoc(collection(db,'repairs'), { customerName:name, customerPhone:phone, details, status:'Pending', createdAt:serverTimestamp() });
      Alert.alert('Success','Repair request sent. We will contact you.');
      setName(''); setPhone(''); setDetails('');
    }catch(e){ console.log(e); Alert.alert('Error','Could not send'); }
  };
  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.header}>Repair Service</Text>
      <TextInput placeholder="Your name" style={s.input} value={name} onChangeText={setName} />
      <TextInput placeholder="Phone" style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput placeholder="Describe issue" style={[s.input,{height:100}]} value={details} onChangeText={setDetails} multiline />
      <TouchableOpacity style={[s.addBtn,{alignSelf:'stretch'}]} onPress={submitRepair}><Text style={{color:'#fff', fontWeight:'700'}}>Send Repair Request</Text></TouchableOpacity>
    </ScrollView>
  );
}

function TrackScreen(){
  const [orderId,setOrderId]=useState(''); const [status,setStatus]=useState(null);
  async function check(){
    if(!orderId) return Alert.alert('Enter order ID');
    try{
      const snap = await getDocs(collection(db,'orders'));
      const found = snap.docs.find(d=>d.id===orderId);
      if(found) setStatus(found.data().status);
      else setStatus('Not found');
    }catch(e){ Alert.alert('Error','Unable to check'); }
  }
  return (
    <View style={s.container}>
      <Text style={s.header}>Track Order</Text>
      <TextInput placeholder="Order ID" style={s.input} value={orderId} onChangeText={setOrderId} />
      <TouchableOpacity style={s.addBtn} onPress={check}><Text style={{color:'#fff', fontWeight:'700'}}>Check</Text></TouchableOpacity>
      {status && <Text style={{marginTop:12}}>Status: {status}</Text>}
    </View>
  );
}

function AccountScreen({ navigation }){
  return (
    <View style={s.container}>
      <Text style={s.header}>Contact & Follow</Text>
      <TouchableOpacity style={s.addBtn} onPress={()=>Linking.openURL('tel:0209576534')}><Text style={{color:'#fff'}}>Call 0209576534</Text></TouchableOpacity>
      <TouchableOpacity style={[s.addBtn,{backgroundColor:'#25D366', marginTop:8}]} onPress={()=>Linking.openURL('https://wa.me/233590822035')}><Text style={{color:'#fff'}}>WhatsApp 0598022035</Text></TouchableOpacity>
      <Text style={{marginTop:12}}>Follow: @gismarts_gh</Text>
      <TouchableOpacity style={[s.textBtn,{marginTop:14}]} onPress={()=>Linking.openURL('https://maps.google.com')}><Text style={{color:'#D4AF37', fontWeight:'700'}}>Rate us on Google</Text></TouchableOpacity>
    </View>
  );
}

/* CART & PROFILE stack */
function CartScreen({ navigation, route }){
  // simple in-memory cart stored in local state for demo — it resets when app reloads.
  // For a persistent cart, save to AsyncStorage or Firestore per user.
  const [cart, setCart] = useState([]);
  const [name,setName]=useState(''); const [phone,setPhone]=useState(''); const [address,setAddress]=useState('');
  useEffect(()=>{
    // handle deep navigation add action
    if(route && route.params && route.params.action === 'add' && route.params.product){
      setCart(prev=>[ ...prev, { ...route.params.product, qty:1 } ]);
    }
  }, [route]);

  function changeQty(idx, delta){
    setCart(prev=>{
      const c = [...prev];
      c[idx].qty = Math.max(1, (c[idx].qty||1) + delta);
      return c;
    });
  }

  async function placeOrder(){
    if(cart.length === 0) return Alert.alert('Cart is empty');
    if(!name || !phone || !address) return Alert.alert('Please fill your profile details');
    try{
      const order = {
        customerName: name,
        customerPhone: phone,
        address,
        items: cart.map(i=>({ id:i.id, name:i.name, price:i.price, qty:i.qty })),
        total: cart.reduce((s,i)=>s + (i.price * (i.qty||1)), 0),
        status: 'Pending',
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db,'orders'), order);
      Alert.alert('Order placed','Order ID: ' + docRef.id + '\nPlease confirm payment via WhatsApp or Call.');
      // clear cart
      setCart([]); setName(''); setPhone(''); setAddress('');
      // open WhatsApp to talk
      Linking.openURL(`https://wa.me/233590822035?text=${encodeURIComponent('I placed an order. Order ID: ' + docRef.id)}`);
    }catch(e){ console.log(e); Alert.alert('Error','Could not place order'); }
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.header}>Your Cart</Text>
      {cart.length===0 ? <Text>No items in cart yet.</Text> :
        cart.map((it, idx)=>(
          <View key={idx} style={s.cartRow}>
            <Text style={{fontWeight:'700'}}>{it.name} x {it.qty||1}</Text>
            <View style={{flexDirection:'row',gap:8}}>
              <TouchableOpacity style={s.smallBtn} onPress={()=>changeQty(idx,-1)}><Text>-</Text></TouchableOpacity>
              <TouchableOpacity style={s.smallBtn} onPress={()=>changeQty(idx,1)}><Text>+</Text></TouchableOpacity>
            </View>
          </View>
        ))
      }

      <Text style={{marginTop:12,fontWeight:'700'}}>Your Details</Text>
      <TextInput placeholder="Name" style={s.input} value={name} onChangeText={setName} />
      <TextInput placeholder="Phone" style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput placeholder="Delivery address" style={s.input} value={address} onChangeText={setAddress} />

      <TouchableOpacity style={[s.addBtn,{marginTop:10}]} onPress={placeOrder}><Text style={{color:'#fff',fontWeight:'700'}}>Place Order</Text></TouchableOpacity>
    </ScrollView>
  );
}

const Tab = createBottomTabNavigator();

export default function App(){
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{headerShown:false}}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Cart" component={CartScreen} />
        <Tab.Screen name="Repairs" component={RepairsScreen} />
        <Tab.Screen name="Track" component={TrackScreen} />
        <Tab.Screen name="Account" component={AccountScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  container:{flex:1, padding:14, backgroundColor:'#fff'},
  header:{fontSize:22, fontWeight:'800', color:'#D4AF37', marginBottom:6},
  slogan:{color:'#444', marginBottom:12},
  card:{flex:1, margin:6, padding:8, borderRadius:8, borderWidth:0.6, borderColor:'#eee', alignItems:'center'},
  img:{width:120, height:120, borderRadius:8, marginBottom:8},
  pName:{fontWeight:'700'},
  pPrice:{marginTop:6, fontWeight:'700'},
  addBtn:{backgroundColor:'#D4AF37', padding:10, borderRadius:8, marginTop:8, alignItems:'center'},
  input:{borderWidth:1, borderColor:'#ddd', padding:10, borderRadius:8, marginTop:8},
  cartRow:{flexDirection:'row',justifyContent:'space-between',padding:8,borderBottomWidth:0.6, borderColor:'#eee',alignItems:'center'},
  smallBtn:{borderWidth:0.6,borderColor:'#ddd',padding:6,borderRadius:6},
  textBtn:{padding:10}
});