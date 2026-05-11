"use client"                                                                                                                         
                                         
import { useState } from "react"
                                            
export default function LandingInsights() {                                                                                          
const [age, setAge] = useState(30)                                                                                                 
                                                                                                                                    
return (                                                                                                                           
    <div className="flex gap-8 p-8 min-h-screen">
    <div className="w-72 shrink-0">                                                                                                
        <p>Age: {age}</p>                   
        <input                                                                                                                       
        type="number"                                                                                                              
        value={age}                                                                                                                
        onChange={(e) => setAge(Number(e.target.value))}                                                                           
        />                                                                                                                           
    </div>                                                                                                                         
    <div className="flex-1">                                                                                                       
        <p>Chart goes here</p>                                                                                                       
    </div>                                                                                                                         
    </div>                                                                                                                           
)                                                                                                                                  
}  